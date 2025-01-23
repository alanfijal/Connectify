from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from flask import current_app
from bson.objectid import ObjectId

match_bp = Blueprint('match_bp', __name__)

@match_bp.route('/swipe/next', methods=['GET'])
@login_required
def get_next_user():

    liked_ids = current_app.mongo.db.likes.distinct("target_user_id", {
        "source_user_id": current_user._id})
    
    user_data = current_app.mongo.db.users.find_one({
        "_id": {"$nin": list(liked_ids) + [current_user._id]}
    })
    if not user_data:
        return jsonify({"error": "No more users"}), 404

    
    user_data["_id"] = str(user_data["_id"])
    return jsonify({
        "_id": user_data["_id"],
        "name": user_data["username"],
        "image_url": user_data.get("profile_image_url", "/static/images/default-profile.png"),
        "bio": user_data.get("bio", "No bio provided"),
        "interests": user_data.get("interests", []),
        "is_neurotypical": user_data.get("is_neurotypical", True),
        "neurodivergences": user_data.get("neurodivergences", [])
    }), 200

@match_bp.route('/swipe/like', methods=['POST'])
@login_required
def like_user():
    data = request.get_json() or {}
    target_user_id = data.get('userID')
    if not target_user_id:
        return jsonify({"error": "No user ID provided"}), 400

    current_app.mongo.db.likes.insert_one({
        "source_user_id": current_user._id,
        "target_user_id": ObjectId(target_user_id),
        "action": "like"
    })

    match_found = current_app.mongo.db.likes.find_one({
        "source_user_id": ObjectId(target_user_id),
        "target_user_id": current_user._id,
        "action": "like"
    })

    if match_found:
        return jsonify({"match": True}), 200
    else:
        return jsonify({"match": False}), 200


@match_bp.route('/swipe/dislike', methods=['POST'])
@login_required
def dislike_user():
    data = request.get_json() or {}
    target_user_id = data.get('userID')
    if not target_user_id:
        return jsonify({"error": "No user ID provided"}), 400

    current_app.mongo.db.likes.insert_one({
        "source_user_id": current_user._id,
        "target_user_id": ObjectId(target_user_id),
        "action": "dislike"
    })

    return jsonify({"ok": True}), 200
