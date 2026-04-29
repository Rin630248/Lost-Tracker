# Lost and Found System

A Django-based Lost and Found system for universities.

## Tech Stack
- Python 3.11
- Django 4+
- Django REST Framework
- PostgreSQL
- Pillow for image handling

## Project Structure
```
lost_tracker/
├── lost_tracker/        # Main Django project
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── items/                # Main app
│   ├── migrations/
│   ├── __init__.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── manage.py
└── requirements.txt
```

## Setup
1. Create virtual environment: `python -m venv venv`
2. Activate: `venv\Scripts\activate` (Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Run migrations: `python manage.py migrate`
5. Create superuser: `python manage.py createsuperuser`
6. Run server: `python manage.py runserver`

## API Endpoints

### User APIs
- `GET /items/` - List all available items
- `GET /items/{id}/` - Item detail
- `POST /claims/` - Create claim
- `POST /reservations/` - Create reservation

### Admin APIs
- `POST /items/` - Create item
- `PATCH /claims/{id}/` - Approve/reject claim
- `PATCH /reservations/{id}/` - Mark as checked out

## Authentication
- Use Django built-in auth system
- Only admins can access admin APIs