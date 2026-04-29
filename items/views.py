# filepath: items/views.py
"""
Views for the Lost and Found system.

This module defines class-based views using Django REST Framework.
Separates user views from admin views with proper permissions.
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.utils import timezone
from django.db.models import Q

from .models import Item, Claim, Reservation
from .serializers import (
    ItemListSerializer, ItemDetailSerializer, ItemCreateSerializer,
    ClaimListSerializer, ClaimDetailSerializer, ClaimCreateSerializer, ClaimUpdateSerializer,
    ReservationListSerializer, ReservationDetailSerializer, 
    ReservationCreateSerializer, ReservationUpdateSerializer
)


class IsAdminOrReadOnly(IsAuthenticated):
    """
    Custom permission:
    - Admin users can create/update/delete
    - Any authenticated user can read
    """
    
    def has_permission(self, request, view):
        # Check if authenticated
        if not super().has_permission(request, view):
            return False
        
        # Allow read for any authenticated user
        if view.action in ['list', 'retrieve']:
            return True
        
        # Require admin for write operations
        return request.user.is_staff


class IsOwnerOrAdmin(IsAuthenticated):
    """
    Custom permission:
    - Admin users can do anything
    - Regular users can only access their own objects
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.is_staff:
            return True
        
        # Check if user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'claim') and hasattr(obj.claim, 'user'):
            return obj.claim.user == request.user
        
        return False


# =============================================================================
# Item Views
# =============================================================================

class ItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing items.
    
    User API:
    - GET /items/ - List all available items
    - GET /items/{id}/ - Item detail
    
    Admin API:
    - POST /items/ - Create new item
    - PUT/PATCH /items/{id}/ - Update item
    - DELETE /items/{id}/ - Delete item
    """
    
    queryset = Item.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ItemListSerializer
        elif self.action == 'retrieve':
            return ItemDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ItemCreateSerializer
        return ItemListSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        
        # Non-admin users only see stored/claimed items
        if not self.request.user.is_staff:
            queryset = queryset.exclude(status='expired')
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Search by name or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Save item with admin user as creator."""
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        """
        Action to create a claim for an item.
        POST /items/{id}/claim/
        """
        item = self.get_object()
        
        # Check if item is available
        if not item.is_available:
            return Response(
                {'error': 'This item is not available for claiming.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create claim
        serializer = ClaimCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


# =============================================================================
# Claim Views
# =============================================================================

class ClaimViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing claims.
    
    User API:
    - GET /claims/ - List user's own claims
    - POST /claims/ - Create new claim
    - GET /claims/{id}/ - Claim detail
    
    Admin API:
    - PATCH /claims/{id}/ - Approve/reject claim
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ClaimListSerializer
        elif self.action == 'retrieve':
            return ClaimDetailSerializer
        elif self.action in ['create']:
            return ClaimCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ClaimUpdateSerializer
        return ClaimListSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Admin sees all claims
        if self.request.user.is_staff:
            return Claim.objects.all()
        
        # Regular users see only their own claims
        return Claim.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Save claim with current user."""
        serializer.save(user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """
        Override update to handle approve/reject for admin.
        """
        instance = self.get_object()
        
        # Only admin can update claims
        if not request.user.is_staff:
            return Response(
                {'error': 'Only administrators can update claims.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Only pending claims can be updated
        if instance.status != 'pending':
            return Response(
                {'error': 'Only pending claims can be updated.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Handle partial update for approve/reject."""
        return self.update(request, *args, **kwargs)


class ClaimListCreateView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating claims.
    
    GET /claims/ - List claims (user's own for regular users, all for admin)
    POST /claims/ - Create a new claim
    """
    
    serializer_class = ClaimListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClaimCreateSerializer
        return ClaimListSerializer
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Claim.objects.all()
        return Claim.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ClaimDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for retrieving and updating a claim.
    
    GET /claims/{id}/ - Get claim detail
    PATCH /claims/{id}/ - Approve/reject claim (admin only)
    """
    
    serializer_class = ClaimDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return ClaimUpdateSerializer
        return ClaimDetailSerializer
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Claim.objects.all()
        return Claim.objects.filter(user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if not request.user.is_staff:
            return Response(
                {'error': 'Only administrators can update claims.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if instance.status != 'pending':
            return Response(
                {'error': 'Only pending claims can be updated.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)


# =============================================================================
# Reservation Views
# =============================================================================

class ReservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing reservations.
    
    User API:
    - GET /reservations/ - List user's own reservations
    - POST /reservations/ - Create new reservation
    - GET /reservations/{id}/ - Reservation detail
    
    Admin API:
    - PATCH /reservations/{id}/ - Mark as checked out
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ReservationListSerializer
        elif self.action == 'retrieve':
            return ReservationDetailSerializer
        elif self.action in ['create']:
            return ReservationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ReservationUpdateSerializer
        return ReservationListSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Admin sees all reservations
        if self.request.user.is_staff:
            return Reservation.objects.all()
        
        # Regular users see only their own reservations
        return Reservation.objects.filter(claim__user=self.request.user)
    
    def perform_create(self, serializer):
        """Save reservation."""
        serializer.save()
    
    def update(self, request, *args, **kwargs):
        """
        Override update to handle checked_out for admin.
        """
        instance = self.get_object()
        
        # Only admin can mark as checked out
        if not request.user.is_staff:
            return Response(
                {'error': 'Only administrators can mark reservations as checked out.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Handle partial update for checked_out."""
        return self.update(request, *args, **kwargs)


class ReservationListCreateView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating reservations.
    
    GET /reservations/ - List reservations
    POST /reservations/ - Create a new reservation
    """
    
    serializer_class = ReservationListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReservationCreateSerializer
        return ReservationListSerializer
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Reservation.objects.all()
        return Reservation.objects.filter(claim__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save()


class ReservationDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for retrieving and updating a reservation.
    
    GET /reservations/{id}/ - Get reservation detail
    PATCH /reservations/{id}/ - Mark as checked out (admin only)
    """
    
    serializer_class = ReservationDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return ReservationUpdateSerializer
        return ReservationDetailSerializer
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Reservation.objects.all()
        return Reservation.objects.filter(claim__user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if not request.user.is_staff:
            return Response(
                {'error': 'Only administrators can update reservations.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)


# =============================================================================
# Utility Views
# =============================================================================

class ExpireItemsView(generics.GenericAPIView):
    """
    Admin-only view to manually expire items.
    
    POST /expire-items/ - Expire all items past their expiry date
    """
    
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """Expire all items that have passed their expiry date."""
        from django.utils import timezone
        
        # Find and update expired items
        expired_items = Item.objects.filter(
            expiry_date__lt=timezone.now(),
            status='stored'
        )
        count = expired_items.update(status='expired')
        
        return Response({
            'message': f'{count} items have been expired.',
            'count': count
        })


class MyClaimsView(generics.ListAPIView):
    """
    API endpoint for listing current user's claims.
    
    GET /my-claims/ - List current user's claims
    """
    
    serializer_class = ClaimListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Claim.objects.filter(user=self.request.user)


class MyReservationsView(generics.ListAPIView):
    """
    API endpoint for listing current user's reservations.
    
    GET /my-reservations/ - List current user's reservations
    """
    
    serializer_class = ReservationListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Reservation.objects.filter(claim__user=self.request.user)