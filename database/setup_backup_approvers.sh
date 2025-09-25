#!/bin/bash

# Backup Approvers Database Setup Script
# This script creates the backup approver tables in your PostgreSQL database

# Database connection details (update these with your actual credentials)
DB_HOST="localhost"
DB_NAME="ithelpdesk_db"
DB_USER="postgres"
DB_PASSWORD="P@SSW0RD"

echo "Creating backup approver tables in PostgreSQL database..."
echo "Database: $DB_HOST/$DB_NAME"

# Execute the SQL script
psql -h "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -f backup_approvers_postgresql.sql

if [ $? -eq 0 ]; then
    echo "✅ Backup approver tables created successfully!"
    echo ""
    echo "Tables created:"
    echo "- backup_approvers"
    echo "- approval_diversions" 
    echo "- backup_approver_logs"
    echo ""
    echo "Views created:"
    echo "- active_backup_approvers"
    echo "- backup_approver_stats"
    echo ""
    echo "You can now use the backup approver functionality in your application."
else
    echo "❌ Error creating backup approver tables. Please check the error messages above."
fi