#!/usr/bin/env ruby

require 'xcodeproj'

# Open the project
project = Xcodeproj::Project.open('IndigoInvestor.xcodeproj')
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

# Get or create Resources group
resources_group = main_group['Resources'] || main_group.new_group('Resources')

# Get or create Fonts group
fonts_group = resources_group['Fonts'] || resources_group.new_group('Fonts')

# Font files to add
font_files = [
  'Montserrat-Black.ttf',
  'Montserrat-BlackItalic.ttf',
  'Montserrat-Bold.ttf',
  'Montserrat-BoldItalic.ttf',
  'Montserrat-ExtraBold.ttf',
  'Montserrat-ExtraBoldItalic.ttf',
  'Montserrat-ExtraLight.ttf',
  'Montserrat-ExtraLightItalic.ttf',
  'Montserrat-Italic.ttf',
  'Montserrat-Light.ttf',
  'Montserrat-LightItalic.ttf',
  'Montserrat-Medium.ttf',
  'Montserrat-MediumItalic.ttf',
  'Montserrat-Regular.ttf',
  'Montserrat-SemiBold.ttf',
  'Montserrat-SemiBoldItalic.ttf',
  'Montserrat-Thin.ttf',
  'Montserrat-ThinItalic.ttf'
]

added_count = 0
font_files.each do |font_file|
  font_path = "IndigoInvestor/Resources/Fonts/#{font_file}"
  
  # Check if file exists
  unless File.exist?(font_path)
    puts "Font file not found: #{font_path}"
    next
  end
  
  # Check if already in project
  existing = fonts_group.files.find { |f| f.path == font_file }
  
  if existing
    puts "Font already in project: #{font_file}"
  else
    # Add file reference
    file_ref = fonts_group.new_reference(font_file)
    file_ref.source_tree = '<group>'
    
    # Add to resources build phase
    target.resources_build_phase.add_file_reference(file_ref)
    
    puts "Added font: #{font_file}"
    added_count += 1
  end
end

# Save the project
project.save

puts "\n✅ Successfully added #{added_count} font files to Xcode project"
puts "Project saved: IndigoInvestor.xcodeproj"

# Add fonts to Info.plist if needed
info_plist_path = 'IndigoInvestor/Info.plist'
if File.exist?(info_plist_path)
  puts "\nNote: Remember to add UIAppFonts array to Info.plist with the font filenames"
else
  puts "\nCreating Info.plist with font configuration..."
  
  info_plist_content = <<-PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>UIAppFonts</key>
    <array>
        <string>Montserrat-Black.ttf</string>
        <string>Montserrat-BlackItalic.ttf</string>
        <string>Montserrat-Bold.ttf</string>
        <string>Montserrat-BoldItalic.ttf</string>
        <string>Montserrat-ExtraBold.ttf</string>
        <string>Montserrat-ExtraBoldItalic.ttf</string>
        <string>Montserrat-ExtraLight.ttf</string>
        <string>Montserrat-ExtraLightItalic.ttf</string>
        <string>Montserrat-Italic.ttf</string>
        <string>Montserrat-Light.ttf</string>
        <string>Montserrat-LightItalic.ttf</string>
        <string>Montserrat-Medium.ttf</string>
        <string>Montserrat-MediumItalic.ttf</string>
        <string>Montserrat-Regular.ttf</string>
        <string>Montserrat-SemiBold.ttf</string>
        <string>Montserrat-SemiBoldItalic.ttf</string>
        <string>Montserrat-Thin.ttf</string>
        <string>Montserrat-ThinItalic.ttf</string>
    </array>
</dict>
</plist>
PLIST
  
  File.write(info_plist_path, info_plist_content)
  puts "Created Info.plist with font configuration"
end
