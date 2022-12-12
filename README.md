# DMARC Status

This is a project encouraging important Norwegian organizations and businesses
to improve their DMARC policies. Check out the site on https://dmarcstatus.no!

DMARC is one of our best weapons in the war on spoofing and phishing. But
setting up good email authentication with SPF, DKIM and DMARC is not common
knowledge. It should be for all people managing web domains!

## How this Website Works

I'm quite satisfied with how this website has achieved the following:

- No (npm) dependencies
- Daily automatic updates
- No JavaScript needed (except for Plausible.js analytics)
- No external resources (except for Plausible.js analytics)
- Free hosting

Cool, right?

Fetching DMARC status is just a matter of querying some DNS records, which is
quite easy with core Node.js. The `index.js` script runs through the domains
listed in `domains.json` and generates the simple HTML site. GitHub Actions
deploys the built site to GitHub Pages on every commit and on every midnight.

## Contribute

Do you know about any domains that should be added to the list? Please submit an
issue or a pull request!
