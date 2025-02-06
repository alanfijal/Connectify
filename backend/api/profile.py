from flask import Blueprint, request, jsonify, current_app, render_template
from flask_login import login_required, current_user

profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """
    Returns the current user's profile info as JSON.
    """
    user_data = current_app.mongo.db.users.find_one({"_id": current_user._id})
    if not user_data:
        return jsonify({"error": "User not found"}), 404
    

    user_data.pop("password", None)
    user_data["_id"] = str(user_data["_id"])

    return jsonify(user_data), 200

@profile_bp.route('/profile', methods=['POST']) 
@login_required
def update_profile():
    """
    Updates the current user's profile based on JSON payload.
    Expects JSON in the form:
    {
      "username": "...",
      "email": "...",
      "is_neurotypical": true/false,
      "neurodivergences": ["ADHD", "Autism"],
      "age": 25,
      "bio": "...",
      "interests": ["Reading", "Gaming"]
    }
    """
    try:
        data = request.get_json() or {}
        
        username = data.get("username")
        email = data.get("email")
        is_neurotypical = data.get("is_neurotypical", True)
        neurodivergences = data.get("neurodivergences") if not is_neurotypical else None
        age = data.get("age")
        bio = data.get("bio")
        interests = data.get("interests")  # expect a list

        update_fields = {}
        if username:
            update_fields["username"] = username
        if email:
            update_fields["email"] = email
        if age is not None:
            update_fields["age"] = age
        if bio is not None:
            update_fields["bio"] = bio

    
        update_fields["is_neurotypical"] = is_neurotypical
        update_fields["neurodivergences"] = neurodivergences
        
        if interests is not None:
            update_fields["interests"] = interests

        if not update_fields:
            return jsonify({"error": "No updates provided."}), 400

        result = current_app.mongo.db.users.update_one(
            {"_id": current_user._id},
            {"$set": update_fields}
        )

        if result.modified_count == 1:
            return jsonify({"message": "Profile updated successfully"}), 200
        else:
            return jsonify({"warning": "No changes made or user not found"}), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@profile_bp.route('/profile/view', methods=['GET'])
@login_required
def view_profile():
    """
    Renders the profile page template
    """
    return render_template('profile.html')
