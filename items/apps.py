# filepath: items/apps.py
"""
App configuration for the items app.
"""

from django.apps import AppConfig


class ItemsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'items'
    verbose_name = 'Lost and Found Items'