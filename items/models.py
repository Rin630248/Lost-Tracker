# filepath: items/models.py
"""
Models for the Lost and Found system.

This module defines the core data models:
- Item: Represents a lost item registered in the system
- Claim: Represents a user's claim on an item
- Reservation: Represents a pickup reservation for an approved claim
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class ItemManager(models.Manager):
    """
    Custom manager for Item model.
    Provides methods to filter items by status and automatically handle expiry.
    """
    
    def available(self):
        """Return items that are stored and not expired."""
        return self.filter(
            status='stored'
        ).filter(
            models.Q(expiry_date__isnull=True) | 
            models.Q(expiry_date__gte=timezone.now())
        )
    
    def expired(self):
        """Return items that have passed their expiry date."""
        return self.filter(
            expiry_date__lt=timezone.now(),
            status='stored'
        )


class Item(models.Model):
    """
    Represents a lost item registered in the Lost and Found center.
    
    Attributes:
        name: Name/title of the item
        description: Detailed description of the item
        image: Image of the item (optional)
        location: Where the item was found/located
        status: Current status of the item (stored, claimed, returned, expired)
        created_at: Timestamp when the item was created
        expiry_date: Date when the item expires (optional)
    """
    
    # Status choices for items
    STATUS_CHOICES = [
        ('stored', 'Stored'),      # Item is in the Lost and Found center
        ('claimed', 'Claimed'),    # Item has an approved claim
        ('returned', 'Returned'),  # Item has been returned to owner
        ('expired', 'Expired'),    # Item has passed expiry date
    ]
    
    name = models.CharField(max_length=200, help_text="Name/title of the item")
    description = models.TextField(help_text="Detailed description of the item")
    image = models.ImageField(
        upload_to='items/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Image of the item (optional)"
    )
    location = models.CharField(
        max_length=200,
        help_text="Location where the item was found or stored"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='stored',
        help_text="Current status of the item"
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp when created")
    expiry_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Date when the item expires and can be disposed of"
    )
    
    # Custom manager
    objects = ItemManager()
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Item'
        verbose_name_plural = 'Items'
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        """
        Override save to automatically update status based on expiry_date.
        """
        # Check if item has expired
        if self.expiry_date and self.expiry_date < timezone.now():
            if self.status == 'stored':
                self.status = 'expired'
        super().save(*args, **kwargs)
    
    @property
    def is_available(self):
        """Check if the item is available for claiming."""
        return self.status == 'stored' and (
            self.expiry_date is None or self.expiry_date >= timezone.now()
        )


class ClaimManager(models.Manager):
    """
    Custom manager for Claim model.
    Provides methods to filter claims by status.
    """
    
    def pending(self):
        """Return pending claims."""
        return self.filter(status='pending')
    
    def approved(self):
        """Return approved claims."""
        return self.filter(status='approved')
    
    def rejected(self):
        """Return rejected claims."""
        return self.filter(status='rejected')


class Claim(models.Model):
    """
    Represents a user's claim on a lost item.
    
    A user can submit a claim explaining why they believe the item belongs to them.
    Multiple users can claim the same item, but only ONE can be approved.
    
    Attributes:
        item: Foreign key to the claimed item
        user: Foreign key to the user making the claim
        message: User's explanation of why they should get the item
        status: Current status of the claim (pending, approved, rejected)
        created_at: Timestamp when the claim was created
    """
    
    # Status choices for claims
    STATUS_CHOICES = [
        ('pending', 'Pending'),    # Awaiting admin review
        ('approved', 'Approved'),  # Claim approved by admin
        ('rejected', 'Rejected'), # Claim rejected by admin
    ]
    
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='claims',
        help_text="The item being claimed"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='claims',
        help_text="The user making the claim"
    )
    message = models.TextField(
        help_text="User's explanation of why they should get the item"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of the claim"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the claim was created"
    )
    
    # Custom manager
    objects = ClaimManager()
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Claim'
        verbose_name_plural = 'Claims'
        # A user can only claim the same item once
        unique_together = ['item', 'user']
    
    def __str__(self):
        return f"Claim by {self.user.username} for {self.item.name} ({self.get_status_display()})"
    
    def approve(self):
        """
        Approve this claim and reject all other claims for the same item.
        """
        # Reject all other claims for this item
        Claim.objects.filter(item=self.item).exclude(pk=self.pk).update(
            status='rejected'
        )
        # Update this claim status
        self.status = 'approved'
        self.save()
        # Update item status
        self.item.status = 'claimed'
        self.item.save()
    
    def reject(self):
        """
        Reject this claim.
        """
        self.status = 'rejected'
        self.save()


class Reservation(models.Model):
    """
    Represents a pickup reservation for an approved claim.
    
    When a claim is approved, the user can book a pickup time to collect the item.
    
    Attributes:
        claim: Foreign key to the approved claim
        pickup_time: Scheduled pickup time
        checked_out: Whether the item has been picked up
    """
    
    claim = models.OneToOneField(
        Claim,
        on_delete=models.CASCADE,
        related_name='reservation',
        help_text="The approved claim for this reservation"
    )
    pickup_time = models.DateTimeField(
        help_text="Scheduled pickup time"
    )
    checked_out = models.BooleanField(
        default=False,
        help_text="Whether the item has been picked up"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the reservation was created"
    )
    
    class Meta:
        ordering = ['pickup_time']
        verbose_name = 'Reservation'
        verbose_name_plural = 'Reservations'
    
    def __str__(self):
        return f"Reservation for {self.claim.item.name} at {self.pickup_time}"
    
    def mark_checked_out(self):
        """
        Mark the item as checked out and update the item status.
        """
        self.checked_out = True
        self.save()
        # Update item status to returned
        self.claim.item.status = 'returned'
        self.claim.item.save()


# Signal to automatically update item status when a claim is approved
@receiver(post_save, sender=Claim)
def update_item_status_on_claim_approval(sender, instance, **kwargs):
    """
    Signal handler to update item status when a claim is approved.
    """
    if instance.status == 'approved':
        item = instance.item
        if item.status != 'returned':
            item.status = 'claimed'
            item.save()