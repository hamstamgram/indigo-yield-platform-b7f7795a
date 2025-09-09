#!/usr/bin/env ruby

require 'xcodeproj'

# Open the project
project = Xcodeproj::Project.open('IndigoInvestor.xcodeproj')
target = project.targets.find { |t| t.name == 'IndigoInvestor' }

# Get the main group
main_group = project.main_group['IndigoInvestor']

# Files to add (relative to IndigoInvestor folder)
files_to_add = [
  'Services/AuthService.swift',
  'Services/PortfolioService.swift', 
  'Services/AdditionalServices.swift',
  'Services/PushNotificationManager.swift',
  'Repositories/Repositories.swift',
  'ViewModels/ViewModels.swift',
  'ViewModels/DashboardViewModel.swift',
  'Core/Data/CoreDataStack.swift',
  'Core/Network/NetworkMonitor.swift'
]

added = 0
files_to_add.each do |file_path|
  full_path = "IndigoInvestor/#{file_path}"
  
  # Skip if file doesn't exist
  unless File.exist?(full_path)
    puts "Skipping missing file: #{full_path}"
    next
  end
  
  # Get or create parent group structure
  path_components = File.dirname(file_path).split('/')
  current_group = main_group
  
  path_components.each do |component|
    existing = current_group.children.find { |c| c.is_a?(Xcodeproj::Project::Object::PBXGroup) && c.path == component }
    current_group = existing || current_group.new_group(component, component)
  end
  
  # Check if file already exists
  file_name = File.basename(file_path)
  existing_file = current_group.files.find { |f| f.path == file_name }
  
  unless existing_file
    # Add file reference
    file_ref = current_group.new_reference(file_name)
    file_ref.source_tree = '<group>'
    
    # Add to build phase
    target.source_build_phase.add_file_reference(file_ref)
    puts "Added: #{file_path}"
    added += 1
  end
end

project.save
puts "\n✅ Added #{added} files to project"
