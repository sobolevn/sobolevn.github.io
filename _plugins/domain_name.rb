require 'uri'

module Jekyll
  module DomainName
    def domain_name(url)
      url = "http://#{url}" if URI.parse(url).scheme.nil?
      host = URI.parse(url).host.downcase
      host.start_with?('www.') ? host[4..-1] : host
    end
  end
end

Liquid::Template.register_filter(Jekyll::DomainName)
