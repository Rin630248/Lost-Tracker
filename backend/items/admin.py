from django.contrib import admin
from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):

    list_display = [
        'item_code',
        'name',
        'category',
        'location',
        'date_found',
        'status',
    ]

    list_filter = ['status', 'date_found']

    search_fields = [
        'item_code',
        'name',
        'description',
        'location'
    ]

    ordering = ['-created_at']

    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        (None, {
            'fields': (
                'item_code',
                'name',
                'category',
                'description',
                'location',
                'date_found',
                'image',
            )
        }),

        ('Status', {
            'fields': ('status',)
        }),

        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )