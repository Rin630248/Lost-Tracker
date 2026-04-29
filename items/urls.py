# filepath: items/urls.py
"""
URL configuration for the Lost and Found API.

This module defines URL patterns for:
- Item endpoints
- Claim endpoints
- Reservation endpoints
- Utility endpoints
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ItemViewSet, ClaimViewSet, ReservationViewSet,
    ClaimListCreateView, ClaimDetailView,
    ReservationListCreateView, ReservationDetailView,
    ExpireItemsView, MyClaimsView, MyReservationsView
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'claims', ClaimViewSet, basename='claim')
router.register(r'reservations', ReservationViewSet, basename='reservation')

# URL patterns
urlpatterns = [
    # -------------------------------------------------------------------------
    # Item Endpoints
    # -------------------------------------------------------------------------
    # Using router (see above):
    # GET /api/items/ - List all items
    # POST /api/items/ - Create item (admin)
    # GET /api/items/{id}/ - Item detail
    # PUT/PATCH /api/items/{id}/ - Update item (admin)
    # DELETE /api/items/{id}/ - Delete item (admin)
    # POST /api/items/{id}/claim/ - Create claim for item
    
    # -------------------------------------------------------------------------
    # Claim Endpoints
    # -------------------------------------------------------------------------
    # Alternative endpoints using generic views:
    path('claims/', ClaimListCreateView.as_view(), name='claim-list-create'),
    path('claims/<int:pk>/', ClaimDetailView.as_view(), name='claim-detail'),
    
    # -------------------------------------------------------------------------
    # Reservation Endpoints
    # -------------------------------------------------------------------------
    # Alternative endpoints using generic views:
    path('reservations/', ReservationListCreateView.as_view(), name='reservation-list-create'),
    path('reservations/<int:pk>/', ReservationDetailView.as_view(), name='reservation-detail'),
    
    # -------------------------------------------------------------------------
    # User-specific Endpoints
    # -------------------------------------------------------------------------
    path('my-claims/', MyClaimsView.as_view(), name='my-claims'),
    path('my-reservations/', MyReservationsView.as_view(), name='my-reservations'),
    
    # -------------------------------------------------------------------------
    # Admin Utility Endpoints
    # -------------------------------------------------------------------------
    path('expire-items/', ExpireItemsView.as_view(), name='expire-items'),
]

# Include router URLs
urlpatterns += router.urls