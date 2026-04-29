"""
WSGI config for lost_tracker project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lost_tracker.settings')

application = get_wsgi_application()