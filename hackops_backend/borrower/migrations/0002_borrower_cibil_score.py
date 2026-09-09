# Generated manually to fix missing migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('borrower', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='borrower',
            name='cibil_score',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
