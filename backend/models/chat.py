from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from bson.objectid import ObjectId
from flask import current_app
from datetime import datetime

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route('/chat/history', methods=['GET'])
@login_required
def get_chat_history():
    recipient_id = request.args.get('recipient_id')
    if not recipient_id:
        return jsonify([]), 200
        
    recipient_obj_id = ObjectId(recipient_id)
    query = {
        "$or": [
            {"$and": [{"sender_id": current_user._id}, {"recipient_id": recipient_obj_id}]},
            {"$and": [{"sender_id": recipient_obj_id}, {"recipient_id": current_user._id}]}
        ]
    }

    messages_cursor = current_app.mongo.db.messages.find(
        query, sort=[("timestamp", 1)]
    )
    messages = []
    for msg in messages_cursor:
        sender = current_app.mongo.db.users.find_one({"_id": msg["sender_id"]})
        sender_name = sender.get("username") if sender else "Unknown"

        messages.append({
            "_id": str(msg["_id"]),
            "sender_id": str(msg["sender_id"]),
            "recipient_id": str(msg["recipient_id"]),
            "sender_name": sender_name,
            "text": msg["text"],
            "timestamp": msg.get("timestamp", "")
        })

    return jsonify(messages), 200

@chat_bp.route('/send-message', methods=['POST'])
@login_required
def send_message():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        message_text = data.get('message')
        recipient_id_str = data.get('recipient_id')
        
        if not message_text:
            return jsonify({"error": "Message text is required"}), 400
        if not recipient_id_str:
            return jsonify({"error": "Recipient ID is required"}), 400
            
        try:
            recipient_id = ObjectId(recipient_id_str)
        except:
            return jsonify({"error": "Invalid recipient ID format"}), 400

        recipient = current_app.mongo.db.users.find_one({"_id": recipient_id})
        if not recipient:
            return jsonify({"error": "Recipient not found"}), 404

        new_msg = {
            "sender_id": current_user._id,
            "recipient_id": recipient_id,
            "text": message_text,
            "timestamp": datetime.utcnow()
        }
        
        result = current_app.mongo.db.messages.insert_one(new_msg)
        
        return jsonify({
            "success": True,
            "message": {
                "id": str(result.inserted_id),
                "sender_id": str(current_user._id),
                "recipient_id": recipient_id_str,
                "text": message_text,
                "timestamp": new_msg["timestamp"].isoformat()
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@chat_bp.route('/ai-assist', methods=['POST'])
@login_required
def ai_assist():
    try:
        data = request.get_json()
        recipient_id = data.get('recipient_id')
        user_prompt = data.get('user_prompt')
        
        if not recipient_id or not user_prompt:
            return jsonify({"error": "Recipient ID and prompt are required"}), 400
            
        
        recipient_obj_id = ObjectId(recipient_id)
        query = {
            "$or": [
                {"$and": [{"sender_id": current_user._id}, {"recipient_id": recipient_obj_id}]},
                {"$and": [{"sender_id": recipient_obj_id}, {"recipient_id": current_user._id}]}
            ]
        }
        
        messages_cursor = current_app.mongo.db.messages.find(
            query, sort=[("timestamp", 1)]
        )
        
        conversation = []
        for msg in messages_cursor:
            sender = current_app.mongo.db.users.find_one({"_id": msg["sender_id"]})
            is_user = msg["sender_id"] == current_user._id
            conversation.append({
                "role": "user" if is_user else "other",
                "content": msg["text"],
                "sender_name": sender.get("username", "Unknown") if sender else "AI Assistant"
            })

        from models.agent import Retriever
        agent = Retriever()
        ai_response = agent.process_conversation(user_prompt, conversation)
        
        return jsonify({"response": ai_response}), 200
    
    except Exception as e:
        print(f"AI assist error: {str(e)}")  # Add logging
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@chat_bp.route('/accelerate', methods=['POST'])
@login_required
def accelerate():
    pass

@chat_bp.route('/matches', methods=['GET'])
@login_required
def get_matches():
    user_likes = set(current_app.mongo.db.likes.distinct(
        "target_user_id",
        {"source_user_id": current_user._id, "action": "like"}
    ))
    
    liked_by = set(current_app.mongo.db.likes.distinct(
        "source_user_id",
        {"target_user_id": current_user._id, "action": "like"}
    ))
    
    mutual_likes = user_likes.intersection(liked_by)
    
    matches = []
    for user_id in mutual_likes:
        user = current_app.mongo.db.users.find_one({"_id": user_id})
        if user:
            matches.append({
                "id": str(user["_id"]),
                "username": user["username"],
                "profile_image": user.get("profile_image_url", "/static/images/default-profile.png")
            })
    
    return jsonify(matches), 200

@chat_bp.route('/message/<message_id>', methods=['PUT'])
@login_required
def update_message(message_id):
    try:
        data = request.get_json()
        new_text = data.get('text')
        
        if not new_text:
            return jsonify({"error": "New message text is required"}), 400
            
        message = current_app.mongo.db.messages.find_one({
            "_id": ObjectId(message_id),
            "sender_id": current_user._id  # Ensure user owns the message
        })
        
        if not message:
            return jsonify({"error": "Message not found or unauthorized"}), 404
            
        result = current_app.mongo.db.messages.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "text": new_text,
                    "edited": True,
                    "edited_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            return jsonify({"success": True, "message": "Message updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update message"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@chat_bp.route('/message/<message_id>', methods=['DELETE'])
@login_required
def delete_message(message_id):
    try:
        message = current_app.mongo.db.messages.find_one({
            "_id": ObjectId(message_id),
            "sender_id": current_user._id  # Ensure user owns the message
        })
        
        if not message:
            return jsonify({"error": "Message not found or unauthorized"}), 404
            
        result = current_app.mongo.db.messages.delete_one({
            "_id": ObjectId(message_id)
        })
        
        if result.deleted_count:
            return jsonify({"success": True, "message": "Message deleted successfully"}), 200
        else:
            return jsonify({"error": "Failed to delete message"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500