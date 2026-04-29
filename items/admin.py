# filepath: items/admin.py
"""
Django admin configuration for the Lost and Found system.

This module registers the models with the Django admin site
and customizes their admin interface.
"""

from django.contrib import admin
from .models import Item, Claim, Reservation


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    """Admin configuration for Item model."""
    
    list_display = ['name', 'location', 'status', 'created_at', 'expiry_date']
    list_filter = ['status', 'created_at', 'expiry_date']
    search_fields = ['name', 'description', 'location']
    readonly_fields = ['created_at']
    list_editable = ['status']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'image', 'location')
        }),
        ('Status', {
            'fields': ('status', 'expiry_date', 'created_at')
        }),
    )


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    """Admin configuration for Claim model."""
    
    list_display = ['item', 'user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['item__name', 'user__username', 'message']
    readonly_fields = ['created_at']
    list_editable = ['status']
    
    fieldsets = (
        ('Claim Information', {
            'fields': ('item', 'user', 'message')
        }),
        ('Status', {
            'fields': ('status', 'created_at')
        }),
    )
    
    actions = ['approve_claims', 'reject_claims']
    
    def approve_claims(self, request, queryset):
        """Bulk action to approve claims."""
        for claim in queryset:
            if claim.status == 'pending':
                claim.approve()
        self.message_user(request, f'{queryset.count()} claims approved.')
    
    approve_claims.short_description = "Approve selected claims"
    
    def reject_claims(self, request, queryset):
        """Bulk action to reject claims."""
        for claim in queryset:
            if claim.status == 'pending':
                claim.reject()
        self.message_user(request, f'{queryset.count()} claims rejected.')
    
    reject_claims.short_description = "Reject selected claims"


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    """Admin configuration for Reservation model."""
    
    list_display = ['claim', 'pickup_time', 'checked_out', 'created_at']
    list_filter = ['checked_out', 'created_at', 'pickup_time']
    search_fields = ['claim__item__name', 'claim__user__username']
    readonly_fields = ['created_at']
    list_editable = ['checked_out']
    
    fieldsets = (
        ('Reservation Information', {
            'fields': ('claim', 'pickup_time')
        }),
        ('Status', {
            'fields': ('checked_out', 'created_at')
        }),
    )
    
    actions = ['mark_as_checked_out']
    
    def mark_as_checked_out(self, request, queryset):
        """Bulk action to mark as checked out."""
        for reservation in queryset:
            if not reservation.checked_out:
                reservation.mark_checked_out()
        self.message_user(request, f'{queryset.count()} reservations marked as checked out.')
    
    mark_as_checked_out.short_description = "Mark selected as checked out"