from flask import Blueprint, request, jsonify
from app.services.RentalService import RentalService
from app.services.RentalRequestService import RentalRequestService

rental_controller = Blueprint('rental_controller', __name__)


@rental_controller.route('/rentals', methods=['POST'])
def create_rental():
    data = request.get_json()
    user_id = data.get('user_id')
    book_id = data.get('book_id')

    rental = RentalService.create_rental(user_id, book_id)
    return jsonify(rental.to_dict()), 201

#get all rentals
@rental_controller.route('/rentals', methods=['GET'])
def get_all_rentals():
    rentals = RentalService.get_all_rentals()
    return jsonify([rental.to_dict() for rental in rentals]), 200
