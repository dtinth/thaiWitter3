
require "watir-webdriver"


Before do
  @host = 'localhost'
  case ENV['BROWSER']
  when "ie"
    @browser = Watir::Browser.new(:remote, { :url => 'http://192.168.105.196:4444/wd/hub',
                            :desired_capabilities => :internet_explorer })
    @host = '192.168.105.1'
  else
    @browser = Watir::Browser.new(:firefox)
  end
end

When /^I go to home page$/ do
  @browser.goto "http://#{@host}:3003/"
end

Then /^I should see a link to (.*)$/ do |href|
  @browser.links.find { |link| link.href.include? href }.should exist
end

After do
  @browser.close
end


