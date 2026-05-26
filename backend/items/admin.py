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
        'item_number_display',
        'status',
    ]

    list_filter = ['status', 'date_found']

    search_fields = [
        '=id',
        'item_code',
        'name',
        'category',
        'description',
        'location',
    ]

    ordering = ['-created_at']

    readonly_fields = ['item_number_display', 'created_at', 'updated_at']

    fieldsets = (
        (None, {
            'fields': (
                'item_number_display',
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

    @admin.display(description='Item No.', ordering='id')
    def item_number_display(self, obj):
        if not obj or obj.pk is None:
            return 'Assigned automatically after save'
        return obj.item_number
