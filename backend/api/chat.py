from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from bson.objectid import ObjectId
from flask import current_app

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route('/chat/history', methods=['GET'])
@login_required
def get_chat_history():

    messages_cursor = current_app.mongo.db.messages.find(
        {}, sort=["_id", -1],
        limit=50
    )

    messages = []
    for msg in messages_cursor:
        msg["_id"] = str(msg["_id"])
        messages.append({
            "sender": msg["sender"],
            "text": msg["text"]
        })
    
    messages.reverse()
    return jsonify(messages), 200 

@chat_bp.route('/send-message', methods=['POST'])
@login_required
def send_message():

    data = request.get_json() or {}
    message_text = data.get('message')
    if not message_text:
        return jsonify({"error": "No message provided"}), 400 
    
    new_msg = {
        "sender": current_user.username,
        "text": message_text
    }
    result = current_app.mongo.db.messages.inser_one(new_msg)
    return jsonify({"ok": True, "inserted_id": str(result.inserted_id)}), 200 

@chat_bp.route('/ai-assist', methods=['POST'])
@login_required
def ai_assist():
    pass


@chat_bp.route('/accelerate', methods=['POST'])
@login_required
def accelerate():
    pass

