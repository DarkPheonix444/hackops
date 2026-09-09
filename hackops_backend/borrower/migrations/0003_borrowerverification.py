# Generated for TrustLens Verification Module

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('borrower', '0002_borrower_cibil_score'),
    ]

    operations = [
        migrations.CreateModel(
            name='BorrowerVerification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('identity_method', models.CharField(
                    choices=[
                        ('DIGILOCKER', 'DigiLocker (Demo)'),
                        ('MANUAL', 'Document Upload & Verification'),
                        ('PAN_DIRECT', 'PAN Verification'),
                        ('HYBRID', 'Hybrid')
                    ],
                    default='HYBRID',
                    max_length=30
                )),
                ('verification_status', models.CharField(
                    choices=[
                        ('VERIFIED', 'Verified'),
                        ('NEEDS_REVIEW', 'Needs Review'),
                        ('FAILED', 'Failed'),
                        ('PENDING', 'Pending')
                    ],
                    default='PENDING',
                    max_length=20
                )),
                ('identity_match', models.CharField(
                    choices=[
                        ('MATCH', 'Match'),
                        ('PARTIAL_MATCH', 'Partial Match'),
                        ('MISMATCH', 'Mismatch'),
                        ('NOT_AVAILABLE', 'Not Available')
                    ],
                    default='NOT_AVAILABLE',
                    max_length=20
                )),
                ('document_status', models.CharField(
                    choices=[
                        ('COMPLETE', 'Complete'),
                        ('PARTIALLY_COMPLETE', 'Partially Complete'),
                        ('MISSING', 'Missing'),
                        ('INVALID', 'Invalid')
                    ],
                    default='MISSING',
                    max_length=25
                )),
                ('consistency_status', models.CharField(
                    choices=[
                        ('CONSISTENT', 'Consistent'),
                        ('MINOR_MISMATCH', 'Minor Mismatch'),
                        ('MAJOR_MISMATCH', 'Major Mismatch'),
                        ('PENDING', 'Pending')
                    ],
                    default='PENDING',
                    max_length=20
                )),
                ('confidence_score', models.PositiveSmallIntegerField(default=0)),
                ('flags', models.JSONField(blank=True, default=list)),
                ('explanation', models.JSONField(blank=True, default=list)),
                ('provider', models.CharField(default='MOCK', max_length=50)),
                ('provider_reference', models.CharField(blank=True, max_length=100)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('borrower', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='verifications',
                    to='borrower.borrower'
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
