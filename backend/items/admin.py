from django.contrib import admin
from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Item model.
    """
    list_display = ['name', 'location', 'date_found', 'status', 'created_at']
    list_filter = ['status', 'date_found']
    search_fields = ['name', 'description', 'location']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'location', 'date_found')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
