from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from bson.objectid import ObjectId
from flask import current_app
from datetime import datetime

channel_bp = Blueprint('channel_bp', __name__)

@channel_bp.route('/channels', methods=['GET'])
@login_required
def get_channels():
    channels = current_app.mongo.db.channels.find({})
    return jsonify([{
        'id': str(channel['_id']),
        'channel_id': channel['channel_id'],
        'name': channel['name'],
        'description': channel['description'],
        'member_count': len(channel.get('members', [])),
        'created_at': channel.get('created_at', ''),
        'created_by': str(channel.get('created_by', '')),
        'is_member': current_user._id in channel.get('members', [])
    } for channel in channels]), 200

@channel_bp.route('/channels', methods=['POST'])
@login_required
def create_channel():
    data = request.get_json()
    
    if not data.get('name') or not data.get('description'):
        return jsonify({'error': 'Name and description are required'}), 400
        
    new_channel = {
        'channel_id': str(ObjectId()),
        'name': data['name'],
        'description': data['description'],
        'created_by': current_user._id,
        'created_at': datetime.utcnow(),
        'members': [current_user._id],
        'events': []
    }
    
    result = current_app.mongo.db.channels.insert_one(new_channel)
    return jsonify({
        'id': str(result.inserted_id),
        'message': 'Channel created successfully'
    }), 201

@channel_bp.route('/channels/<channel_id>/join', methods=['POST'])
@login_required
def join_channel(channel_id):
    try:
        # Find the channel
        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        # Check if user is already a member
        if current_user._id in channel.get('members', []):
            return jsonify({'error': 'Already a member of this channel'}), 400

        # Add user to channel members
        result = current_app.mongo.db.channels.update_one(
            {'channel_id': channel_id},
            {'$addToSet': {'members': current_user._id}}
        )

        if result.modified_count > 0:
            return jsonify({'message': 'Successfully joined channel'}), 200
        else:
            return jsonify({'error': 'Failed to join channel'}), 400

    except Exception as e:
        print(f"Error joining channel: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/leave', methods=['POST'])
@login_required
def leave_channel(channel_id):
    try:
        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        if current_user._id not in channel.get('members', []):
            return jsonify({'error': 'Not a member of this channel'}), 400

        result = current_app.mongo.db.channels.update_one(
            {'channel_id': channel_id},
            {'$pull': {'members': current_user._id}}
        )

        if result.modified_count > 0:
            return jsonify({'message': 'Successfully left channel'}), 200
        else:
            return jsonify({'error': 'Failed to leave channel'}), 400

    except Exception as e:
        print(f"Error leaving channel: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/events', methods=['POST'])
@login_required
def create_event(channel_id):
    try:
        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        if current_user._id not in channel.get('members', []):
            return jsonify({'error': 'Must be a channel member to create events'}), 403

        data = request.get_json()
        if not all(key in data for key in ['title', 'description', 'date', 'time']):
            return jsonify({'error': 'Missing required event fields'}), 400
            
        event = {
            '_id': ObjectId(),  
            'title': data['title'],
            'description': data['description'],
            'date': data['date'],
            'time': data['time'],
            'created_by': current_user._id,
            'created_at': datetime.utcnow(),
            'participants': [current_user._id]  
        }
        
  
        result = current_app.mongo.db.channels.update_one(
            {'channel_id': channel_id},
            {'$push': {'events': event}}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'message': 'Event created successfully',
                'event_id': str(event['_id']),
                'event': {
                    'id': str(event['_id']),
                    'title': event['title'],
                    'description': event['description'],
                    'date': event['date'],
                    'time': event['time'],
                    'created_by': str(event['created_by']),
                    'created_at': event['created_at'].isoformat(),
                    'participants': [str(pid) for pid in event['participants']]
                }
            }), 201
        else:
            return jsonify({'error': 'Failed to create event'}), 400
        
    except Exception as e:
        print(f"Error creating event: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/events/<event_id>', methods=['GET'])
@login_required
def get_event(channel_id, event_id):
    try:
        channel = current_app.mongo.db.channels.find_one({
            'channel_id': channel_id,
            'events._id': ObjectId(event_id)
        })
        
        if not channel:
            return jsonify({'error': 'Event not found'}), 404
            
        event = next((e for e in channel['events'] if str(e['_id']) == event_id), None)
        if not event:
            return jsonify({'error': 'Event not found'}), 404
            
        return jsonify({
            'id': str(event['_id']),
            'title': event['title'],
            'description': event['description'],
            'date': event['date'],
            'time': event['time'],
            'created_by': str(event['created_by']),
            'created_at': event['created_at'].isoformat() if isinstance(event['created_at'], datetime) else event['created_at'],
            'participants': [str(pid) for pid in event['participants']]
        }), 200
        
    except Exception as e:
        print(f"Error getting event: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/events/<event_id>/join', methods=['POST'])
@login_required
def join_event(channel_id, event_id):
    try:
        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
            
        if current_user._id not in channel.get('members', []):
            return jsonify({'error': 'Must be a channel member to join events'}), 403

        event = None
        for e in channel.get('events', []):
            if str(e['_id']) == event_id:
                event = e
                break

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        if current_user._id in event.get('participants', []):
            return jsonify({'error': 'Already joined this event'}), 400

        result = current_app.mongo.db.channels.update_one(
            {
                'channel_id': channel_id,
                'events._id': ObjectId(event_id)
            },
            {'$addToSet': {'events.$.participants': current_user._id}}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'message': 'Successfully joined event',
                'event_id': event_id,
                'participant_id': str(current_user._id)
            }), 200
        else:
            return jsonify({'error': 'Failed to join event'}), 400
            
    except Exception as e:
        print(f"Error joining event: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/events/<event_id>/leave', methods=['POST'])
@login_required
def leave_event(channel_id, event_id):
    try:
        print(f"Leave event request - Channel ID: {channel_id}, Event ID: {event_id}")
        print(f"Current user ID: {current_user._id}")

        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            print("Channel not found")
            return jsonify({'error': 'Channel not found'}), 404

        event = None
        for e in channel.get('events', []):
            if str(e['_id']) == event_id:
                event = e
                break

        if not event:
            print("Event not found")
            return jsonify({'error': 'Event not found'}), 404

        print(f"Event participants: {event.get('participants', [])}")
        print(f"Current user ID type: {type(current_user._id)}")
        print(f"Participant IDs types: {[type(pid) for pid in event.get('participants', [])]}")

        is_participant = any(str(pid) == str(current_user._id) for pid in event.get('participants', []))
        print(f"Is participant: {is_participant}")

        if not is_participant:
            print("User is not a participant")
            return jsonify({'error': 'Not a participant in this event'}), 400

        result = current_app.mongo.db.channels.update_one(
            {
                'channel_id': channel_id,
                'events._id': ObjectId(event_id)
            },
            {'$pull': {'events.$.participants': current_user._id}}
        )
        
        print(f"Update result: {result.modified_count}")
        
        if result.modified_count > 0:
            return jsonify({
                'message': 'Successfully left event',
                'event_id': event_id,
                'participant_id': str(current_user._id)
            }), 200
        else:
            print("Failed to update participants")
            return jsonify({'error': 'Failed to leave event'}), 400
            
    except Exception as e:
        print(f"Error leaving event: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/events/<event_id>/participants', methods=['GET'])
@login_required
def get_event_participants(channel_id, event_id):
    try:
        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        event = None
        for e in channel.get('events', []):
            if str(e['_id']) == event_id:
                event = e
                break

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        participants = []
        for participant_id in event.get('participants', []):
            user = current_app.mongo.db.users.find_one({'_id': participant_id})
            if user:
                participants.append({
                    'id': str(user['_id']),
                    'username': user['username'],
                    'profile_image': user.get('profile_image_url', '/static/images/default-profile.png')
                })

        return jsonify({
            'event_id': event_id,
            'participants': participants
        }), 200

    except Exception as e:
        print(f"Error getting event participants: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>', methods=['GET'])
@login_required
def get_channel(channel_id):
    try:
        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        if current_user._id not in channel.get('members', []):
            return jsonify({'error': 'You are not a member of this channel'}), 403
        
        member_ids = channel.get('members', [])
        members = []
        for member_id in member_ids:
            user = current_app.mongo.db.users.find_one({'_id': member_id})
            if user:
                members.append({
                    'id': str(user['_id']),
                    'username': user['username'],
                    'profile_image': user.get('profile_image_url', '/static/images/default-profile.png')
                })

        messages_cursor = current_app.mongo.db.channel_messages.find(
            {'channel_id': channel_id}
        )

        messages = []
        if messages_cursor:
            messages_list = list(messages_cursor)
            messages_list.sort(key=lambda x: x.get('timestamp', datetime.min) if isinstance(x.get('timestamp'), datetime) else datetime.min)
            
            for msg in messages_list:
                try:
                    sender = current_app.mongo.db.users.find_one({"_id": msg.get("sender_id")})
                    sender_name = sender.get("username") if sender else "Unknown"
                    
                    timestamp = msg.get('timestamp')
                    if isinstance(timestamp, datetime):
                        timestamp = timestamp.isoformat()
                    
                    messages.append({
                        "id": str(msg["_id"]),
                        "sender_id": str(msg.get("sender_id", "")),
                        "sender_name": sender_name,
                        "text": msg.get("text", ""),
                        "timestamp": timestamp
                    })
                except Exception as msg_error:
                    print(f"Error processing message: {msg_error}")
                    continue

        events = []
        for event in channel.get('events', []):
            try:
                events.append({
                    'id': str(event['_id']),
                    'title': event['title'],
                    'description': event['description'],
                    'date': event['date'],
                    'time': event['time'],
                    'created_by': str(event['created_by']),
                    'created_at': event['created_at'].isoformat() if isinstance(event['created_at'], datetime) else event['created_at'],
                    'participants': [str(pid) for pid in event.get('participants', [])]  
                })
            except Exception as event_error:
                print(f"Error processing event: {event_error}")
                continue

        response_data = {
            'id': str(channel['_id']),
            'channel_id': channel.get('channel_id', ''),
            'name': channel.get('name', 'Unnamed Channel'),
            'description': channel.get('description', ''),
            'created_at': channel.get('created_at', ''),
            'created_by': str(channel.get('created_by', '')),
            'members': members,
            'events': events, 
            'messages': messages
        }

        print("Current user ID:", str(current_user._id))  
        print("Response events:", events) 

        return jsonify(response_data), 200
            
    except Exception as e:
        print(f"Error in get_channel: {str(e)}")
        return jsonify({'error': str(e)}), 500

@channel_bp.route('/channels/<channel_id>/messages', methods=['POST'])
@login_required
def send_channel_message(channel_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        message_text = data.get('message')
        if not message_text:
            return jsonify({"error": "Message text is required"}), 400

        channel = current_app.mongo.db.channels.find_one({'channel_id': channel_id})
        if not channel:
            return jsonify({"error": "Channel not found"}), 404
            
        if current_user._id not in channel.get('members', []):
            return jsonify({"error": "You must be a member to send messages"}), 403

        new_msg = {
            "channel_id": channel_id,
            "sender_id": current_user._id,
            "text": message_text,
            "timestamp": datetime.utcnow()
        }
        
        result = current_app.mongo.db.channel_messages.insert_one(new_msg)
        
        sender = current_app.mongo.db.users.find_one({"_id": current_user._id})
        sender_name = sender.get("username") if sender else "Unknown"
        
        return jsonify({
            "success": True,
            "message": {
                "id": str(result.inserted_id),
                "sender_id": str(current_user._id),
                "sender_name": sender_name,
                "text": message_text,
                "timestamp": new_msg["timestamp"].isoformat()
            }
        }), 201

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@channel_bp.route('/channels/<channel_id>/messages/<message_id>', methods=['PUT'])
@login_required
def update_channel_message(channel_id, message_id):
    try:
        data = request.get_json()
        new_text = data.get('text')
        
        if not new_text:
            return jsonify({"error": "New message text is required"}), 400
            
        message = current_app.mongo.db.channel_messages.find_one({
            "_id": ObjectId(message_id),
            "channel_id": channel_id,
            "sender_id": current_user._id  
        })
        
        if not message:
            return jsonify({"error": "Message not found or unauthorized"}), 404
            
        result = current_app.mongo.db.channel_messages.update_one(
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

@channel_bp.route('/channels/<channel_id>/messages/<message_id>', methods=['DELETE'])
@login_required
def delete_channel_message(channel_id, message_id):
    try:
        message = current_app.mongo.db.channel_messages.find_one({
            "_id": ObjectId(message_id),
            "channel_id": channel_id,
            "sender_id": current_user._id  
        })
        
        if not message:
            return jsonify({"error": "Message not found or unauthorized"}), 404
            
        result = current_app.mongo.db.channel_messages.delete_one({
            "_id": ObjectId(message_id)
        })
        
        if result.deleted_count:
            return jsonify({"success": True, "message": "Message deleted successfully"}), 200
        else:
            return jsonify({"error": "Failed to delete message"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
