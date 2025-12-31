#!/usr/bin/env ruby

require 'xcodeproj'

# Open the project
project_path = 'IndigoInvestor.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'IndigoInvestor' }

if target.nil?
  puts "Error: Could not find target 'IndigoInvestor'"
  exit 1
end

puts "Checking and fixing file references..."

# Check all file references in the build phase
fixed_count = 0
error_count = 0

target.source_build_phase.files.each do |build_file|
  file_ref = build_file.file_ref
  next unless file_ref
  
  # Get the full path that Xcode thinks the file is at
  full_path = file_ref.real_path.to_s rescue nil
  
  if full_path && full_path.include?('/IndigoInvestor/IndigoInvestor/')
    # This path has the double IndigoInvestor issue
    puts "Found problematic path: #{full_path}"
    
    # Fix the path by removing the duplicate
    correct_path = full_path.gsub('/IndigoInvestor/IndigoInvestor/', '/IndigoInvestor/')
    
    if File.exist?(correct_path)
      puts "  Fixing to: #{correct_path}"
      
      # Get the relative path from project root
      relative_path = correct_path.gsub(/^.*\/ios\//, '')
      
      # Update the file reference
      file_ref.path = relative_path
      file_ref.source_tree = 'SOURCE_ROOT'
      
      fixed_count += 1
    else
      puts "  ERROR: Corrected path doesn't exist: #{correct_path}"
      error_count += 1
    end
  elsif full_path && !File.exist?(full_path)
    puts "Missing file: #{full_path}"
    
    # Try to find the file in the project directory
    filename = File.basename(full_path)
    found_files = Dir.glob("IndigoInvestor/**/**/#{filename}")
    
    if found_files.length == 1
      correct_path = found_files.first
      puts "  Found at: #{correct_path}"
      file_ref.path = correct_path
      file_ref.source_tree = 'SOURCE_ROOT'
      fixed_count += 1
    elsif found_files.length > 1
      puts "  Multiple matches found, skipping..."
    else
      puts "  File not found in project"
      error_count += 1
    end
  end
end

# Save the project
if fixed_count > 0
  project.save
  puts "\n✅ Fixed #{fixed_count} file references"
else
  puts "\n✅ All file references appear correct"
end

if error_count > 0
  puts "⚠️  #{error_count} file references could not be fixed"
end

puts "Project saved: #{project_path}"
