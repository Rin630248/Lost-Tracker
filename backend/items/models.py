from django.db import models


class Item(models.Model):
    """
    Model representing a lost/found item in the university Lost and Found system.
    Items are never deleted - completed items remain visible for records.
    """

    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
    ]
    
    name = models.CharField(max_length=200, help_text="Name of the lost/found item")
    description = models.TextField(blank=True, help_text="Detailed description of the item")
    location = models.CharField(max_length=200, help_text="Location where the item was found")
    date_found = models.DateField(help_text="Date when the item was found")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current status of the item",
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp when the item was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Timestamp when the item was last updated")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Item'
        verbose_name_plural = 'Items'
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
