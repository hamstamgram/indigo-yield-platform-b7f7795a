#!/usr/bin/env ruby

require 'xcodeproj'
require 'pathname'

# Open the project
project_path = 'IndigoInvestor.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'IndigoInvestor' }

if target.nil?
  puts "Error: Could not find target 'IndigoInvestor'"
  exit 1
end

# Get the main group
main_group = project.main_group['IndigoInvestor']

if main_group.nil?
  puts "Error: Could not find main group 'IndigoInvestor'"
  exit 1
end

# Files to add
files_to_add = {
  'Services' => [
    'Services/AuthService.swift',
    'Services/PortfolioService.swift',
    'Services/AdditionalServices.swift',
    'Services/PushNotificationManager.swift'
  ],
  'Repositories' => [
    'Repositories/Repositories.swift'
  ],
  'ViewModels' => [
    'ViewModels/ViewModels.swift',
    'ViewModels/DashboardViewModel.swift'
  ],
  'Core/Data' => [
    'Core/Data/CoreDataStack.swift'
  ],
  'Core/Network' => [
    'Core/Network/NetworkMonitor.swift'
  ]
}

# Function to get or create group
def get_or_create_group(parent_group, path)
  components = path.split('/')
  current_group = parent_group
  
  components.each do |component|
    existing = current_group.children.find { |child| 
      child.is_a?(Xcodeproj::Project::Object::PBXGroup) && child.name == component 
    }
    
    if existing
      current_group = existing
    else
      new_group = current_group.new_group(component)
      current_group = new_group
    end
  end
  
  current_group
end

# Add files to project
added_count = 0
files_to_add.each do |group_path, files|
  # Get or create the group
  group = get_or_create_group(main_group, group_path)
  
  files.each do |file_path|
    full_path = "IndigoInvestor/#{file_path}"
    
    # Check if file exists
    unless File.exist?(full_path)
      puts "Warning: File not found: #{full_path}"
      next
    end
    
    # Check if file is already in project
    file_name = File.basename(file_path)
    existing = group.children.find { |child| 
      child.is_a?(Xcodeproj::Project::Object::PBXFileReference) && child.name == file_name 
    }
    
    if existing
      puts "File already in project: #{file_path}"
      next
    end
    
    # Add file reference with relative path
    relative_path = Pathname.new(full_path).relative_path_from(Pathname.new('.'))
    file_ref = group.new_file(relative_path.to_s)
    
    # Add to build phase if it's a Swift file
    if file_path.end_with?('.swift')
      target.source_build_phase.add_file_reference(file_ref)
      puts "Added to project: #{file_path}"
      added_count += 1
    end
  end
end

# Save the project
project.save

puts "\n✅ Successfully added #{added_count} files to Xcode project"
puts "Project saved: #{project_path}"
