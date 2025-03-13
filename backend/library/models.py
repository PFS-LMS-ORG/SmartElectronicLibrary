from django.db import models
from django.contrib.auth.models import AbstractUser

# Custom User Model
class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=[('Admin', 'Admin'), ('Member', 'Member')], default='Member')
    borrowed_books = models.JSONField(default=list)  # Array of book IDs
    registration_date = models.DateTimeField(auto_now_add=True)
    profile_picture = models.URLField(blank=True, null=True)

# Books
class Book(models.Model):
    book_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    isbn = models.CharField(max_length=13, unique=True)
    author = models.CharField(max_length=255)
    publication_year = models.IntegerField()
    genre = models.CharField(max_length=50)
    pdf_link = models.URLField()
    availability = models.CharField(max_length=20, choices=[('Available', 'Available'), ('Borrowed', 'Borrowed'), ('Reserved', 'Reserved')], default='Available')
    tags = models.JSONField(default=list)  # Array of keywords

# Reservations
class Reservation(models.Model):
    reservation_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Canceled', 'Canceled')], default='Pending')
    reservation_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    pickup_location = models.CharField(max_length=100)

# Chats
class Chat(models.Model):
    chat_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    intent = models.CharField(max_length=50)

# Book Reviews
class BookReview(models.Model):
    review_id = models.AutoField(primary_key=True)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 stars
    comment = models.TextField()
    review_date = models.DateTimeField(auto_now_add=True)

# Notifications
class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=[('Sent', 'Sent'), ('Read', 'Read')], default='Sent')
    timestamp = models.DateTimeField(auto_now_add=True)