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

# Add CoreDataModel.swift
group = get_or_create_group(main_group, 'Core/Data')
file_path = 'IndigoInvestor/Core/Data/CoreDataModel.swift'
actual_file_path = file_path

if File.exist?(actual_file_path)
  # Check if already in project
  file_name = File.basename(file_path)
  
  # First, remove any existing incorrect references
  group.children.select { |child| 
    child.is_a?(Xcodeproj::Project::Object::PBXFileReference) && child.name == file_name 
  }.each { |ref|
    target.source_build_phase.files.select { |bf| bf.file_ref == ref }.each { |bf|
      target.source_build_phase.remove_file_reference(bf.file_ref)
    }
    ref.remove_from_project
  }
  
  existing = nil
  
  if existing
    puts "File already in project: CoreDataModel.swift"
  else
    # Add file reference with correct path
    file_ref = group.new_reference(actual_file_path)
    file_ref.name = file_name
    file_ref.path = actual_file_path
    
    # Add to build phase
    target.source_build_phase.add_file_reference(file_ref)
    puts "✅ Added CoreDataModel.swift to project"
  end
else
  puts "Error: File not found: #{file_path}"
end

# Save the project
project.save
puts "Project saved: #{project_path}"
