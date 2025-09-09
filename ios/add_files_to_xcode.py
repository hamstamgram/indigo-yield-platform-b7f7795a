#!/usr/bin/env python3
import os
import re
import uuid

def generate_uuid():
    """Generate a 24-character hex UUID for Xcode"""
    return uuid.uuid4().hex[:24].upper()

def add_files_to_xcode_project():
    project_file = 'IndigoInvestor.xcodeproj/project.pbxproj'
    
    # Read the current project file
    with open(project_file, 'r') as f:
        content = f.read()
    
    # Files to add
    files_to_add = [
        ('Services/AuthService.swift', 'Services'),
        ('Services/PortfolioService.swift', 'Services'),
        ('Services/AdditionalServices.swift', 'Services'),
        ('Services/PushNotificationManager.swift', 'Services'),
        ('Services/SecurityManager.swift', 'Services'),
        ('Repositories/Repositories.swift', 'Repositories'),
        ('ViewModels/ViewModels.swift', 'ViewModels'),
        ('ViewModels/DashboardViewModel.swift', 'ViewModels'),
        ('Core/Data/CoreDataStack.swift', 'Core/Data'),
        ('Core/Networking/NetworkMonitor.swift', 'Core/Networking'),
        ('Core/Extensions/View+Extensions.swift', 'Core/Extensions'),
        ('Core/Extensions/Color+Extensions.swift', 'Core/Extensions'),
        ('Core/Extensions/Font+Extensions.swift', 'Core/Extensions'),
        ('Models/User.swift', 'Models'),
        ('Models/Transaction.swift', 'Models'),
        ('Models/Document.swift', 'Models'),
        ('Models/IndigoInvestor.xcdatamodeld', 'Models'),
        ('Views/Portfolio/PortfolioView.swift', 'Views/Portfolio'),
        ('Views/Portfolio/PortfolioDetailView.swift', 'Views/Portfolio'),
        ('Views/Transactions/TransactionsView.swift', 'Views/Transactions'),
        ('Views/Transactions/TransactionDetailView.swift', 'Views/Transactions'),
        ('Views/Documents/DocumentsView.swift', 'Views/Documents'),
        ('Views/Documents/YieldHistoryView.swift', 'Views/Documents'),
        ('Views/Documents/StatementView.swift', 'Views/Documents'),
        ('Views/Profile/ProfileView.swift', 'Views/Profile'),
        ('Views/Settings/SettingsView.swift', 'Views/Settings'),
        ('Views/Settings/NotificationSettingsView.swift', 'Views/Settings'),
        ('Views/Settings/PrivacySettingsView.swift', 'Views/Settings'),
        ('Views/Settings/BankAccountsView.swift', 'Views/Settings'),
        ('Views/Support/HelpView.swift', 'Views/Support'),
        ('Views/Support/ContactView.swift', 'Views/Support'),
        ('Views/Support/FAQView.swift', 'Views/Support'),
        ('Views/Admin/AdminDashboardView.swift', 'Views/Admin'),
        ('Views/Admin/InvestorDetailView.swift', 'Views/Admin'),
        ('Views/Admin/TransactionManagementView.swift', 'Views/Admin'),
        ('Views/Admin/WithdrawalApprovalView.swift', 'Views/Admin'),
        ('Views/Components/LoadingView.swift', 'Views/Components'),
        ('Views/Components/ErrorView.swift', 'Views/Components'),
        ('Views/Components/EmptyStateView.swift', 'Views/Components'),
        ('Views/Components/ChartView.swift', 'Views/Components'),
        ('Views/Components/CardView.swift', 'Views/Components'),
        ('Views/Components/CustomTabBar.swift', 'Views/Components'),
        ('Theme/IndigoTheme.swift', 'Theme'),
        ('Theme/ColorScheme.swift', 'Theme'),
        ('Theme/Typography.swift', 'Theme'),
    ]
    
    # Generate UUIDs for each file
    file_refs = {}
    build_refs = {}
    
    for file_path, _ in files_to_add:
        filename = os.path.basename(file_path)
        if os.path.exists(f'IndigoInvestor/{file_path}'):
            file_refs[file_path] = generate_uuid()
            if file_path.endswith('.swift'):
                build_refs[file_path] = generate_uuid()
    
    # Add PBXFileReference entries
    file_ref_section = content.find('/* Begin PBXFileReference section */')
    file_ref_end = content.find('/* End PBXFileReference section */')
    
    new_file_refs = []
    for file_path, _ in files_to_add:
        if file_path in file_refs:
            filename = os.path.basename(file_path)
            ref_id = file_refs[file_path]
            if file_path.endswith('.xcdatamodeld'):
                file_type = 'wrapper.xcdatamodel'
            else:
                file_type = 'sourcecode.swift'
            new_file_refs.append(f'\t\t{ref_id} /* {filename} */ = {{isa = PBXFileReference; lastKnownFileType = {file_type}; path = {filename}; sourceTree = "<group>"; }};')
    
    if new_file_refs:
        insertion_point = content.rfind('\n', file_ref_section, file_ref_end)
        content = content[:insertion_point] + '\n' + '\n'.join(new_file_refs) + content[insertion_point:]
    
    # Add PBXBuildFile entries for Swift files
    build_file_section = content.find('/* Begin PBXBuildFile section */')
    build_file_end = content.find('/* End PBXBuildFile section */')
    
    new_build_files = []
    for file_path, _ in files_to_add:
        if file_path in build_refs:
            filename = os.path.basename(file_path)
            ref_id = file_refs[file_path]
            build_id = build_refs[file_path]
            new_build_files.append(f'\t\t{build_id} /* {filename} in Sources */ = {{isa = PBXBuildFile; fileRef = {ref_id} /* {filename} */; }};')
    
    if new_build_files:
        insertion_point = content.rfind('\n', build_file_section, build_file_end)
        content = content[:insertion_point] + '\n' + '\n'.join(new_build_files) + content[insertion_point:]
    
    # Add files to Sources build phase
    sources_section = content.find('31DB31906E36BFD7EB069575 /* Sources */ = {')
    if sources_section != -1:
        files_section = content.find('files = (', sources_section)
        files_end = content.find(');', files_section)
        
        new_source_entries = []
        for file_path, _ in files_to_add:
            if file_path in build_refs:
                filename = os.path.basename(file_path)
                build_id = build_refs[file_path]
                new_source_entries.append(f'\t\t\t\t{build_id} /* {filename} in Sources */,')
        
        if new_source_entries:
            insertion_point = content.rfind('\n', files_section, files_end)
            content = content[:insertion_point] + '\n' + '\n'.join(new_source_entries) + content[insertion_point:]
    
    # Write the updated project file
    with open(project_file, 'w') as f:
        f.write(content)
    
    print(f"Successfully added {len(file_refs)} files to Xcode project")
    print("Files added:")
    for file_path, _ in files_to_add:
        if file_path in file_refs:
            print(f"  - {file_path}")

if __name__ == "__main__":
    os.chdir('/Users/mama/indigo-yield-platform-v01/ios')
    add_files_to_xcode_project()
