# Welcome to Iridium, a tool for vocal artists

Visit https://geuis.github.io/iridium-vocal/ to use Iridium yourself. Make sure to read the usage notes below first.

Need help, have questions, or want to propose ideas? See the Support and Contact section below.

## What is Iridium?

Iridium is a practice tool for vocal artists. 

## How to use Iridium?

After clicking start, Iridium will record from your selected microphone. It will detect when you stop speaking and after a configurable delay period, the recorded audio will be played back in a loop. Simply begin speaking again to continue the session. **Make sure you are using headphones. Using a speaker will cause feedback issues.**

## Configuration

There are two settings that can be changed: Threshold and Delay. 

### Threshold

Threshold lets you adjust the minimum noise detection level. Since most vocal artists use studios that are soundproofed, this setting allows you to make minor adjustments for an already semi-quiet environment. It can't work correctly in a loud space.

### Delay

Delay sets the minimum amount of time that Iridium should wait after you stop speaking before continuing to record.

## Supported Browsers

Currently Iridium is only working in Chrome. It also works in Firefox, but there are some minor styling issues that still have to be fixed to make the application usable in that browser. No other browsers (Desktop and Mobile Safari or Internet Explorer) completely support the browser features that Iridium requires to work, so support is limited for now.

Iridium uses the [web audio api](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) to interface with your microphone. Currently only Chrome and Firefox fully support this specification. 

The goal is to eventually let Iridium work on all supporting devices, from phones and tablets to all desktop browsers.

## Troubleshooting

### No audio being recorded?

Double check that your microphone isn't muted. This seems dumb and/or obvious, but its the number one reason that Iridium doesn't seem to be recording.

### Check that audio devices are allowed

During the first time you try accessing Iridium, Chrome should ask you to choose a microphone to record from. If you have selected the wrong one (laptop internal microphone versus your external mic) or did not permit access, there is a camera icon on the right side of your address bar. Click on that icon and update your settings.

### Getting feedback issues?

You have to use headphones. If Iridium can hear its own audio output, it creates feedback and will not let the app work correctly.

## Support and Contact

If you are technically savy and/or familiar with Github, [please create an issue](https://github.com/geuis/iridium-vocal/issues).

Otherwise, feel free to just contact me directly via email with your problems, suggestions, and questions at charles@geuis.com.
