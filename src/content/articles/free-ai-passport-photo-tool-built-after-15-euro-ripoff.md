---
title: "How a Developer Built a Free AI Passport Photo Tool After Getting Charged €15 for a JPEG"
date: 2026-03-04
tags: ["ai-tools", "computer-vision", "privacy", "side-project"]
excerpt: "After paying €15 for a 30-second photo studio crop job, one developer built a free, privacy-first passport photo tool that runs entirely in your browser."
author: "aibuilt.it"
category: "automation"
contentType: "case-study"
toolName: "PassportPhotoSnap"
toolUrl: "https://www.passportphotosnap.com"
sourceUrl: "https://www.reddit.com/r/SideProject/comments/1rbl8sw/built_a_free_passport_photo_tool_because_i_got/"
sourcePlatform: "reddit"
---

## The €15 Photo That Started Everything

Most people have the same experience at a passport photo studio: walk in, sit on a stool, get one photo taken, watch someone crop it for 30 seconds, and pay somewhere between $10 and $20 for the privilege. It's one of those small annoyances nobody questions — until they do.

Reddit user visata questioned it after getting charged €15 at a European photo studio for what amounted to a JPEG crop. The whole interaction lasted about 30 seconds. That frustration turned into [PassportPhotoSnap](https://www.passportphotosnap.com), a free browser-based tool that uses on-device AI to generate compliant passport photos for 140+ countries.

The project exploded on Reddit's r/SideProject community, pulling in over 1,700 upvotes and 169 comments — with users confirming it actually works.

## What PassportPhotoSnap Actually Does

The tool handles the entire passport photo workflow in three steps:

**Pick your country.** PassportPhotoSnap has templates for over 140 countries, each with the exact official specifications — dimensions, background color, head size requirements, and DPI settings. US passport photos need 2x2 inches at 300 DPI with a white background and a head height between 25–35mm. UK photos need 35x45mm with a light grey background. The tool knows all of this.

**Upload and auto-adjust.** Drop in any photo and the AI takes over. Face detection automatically finds your face and centers it according to the country's head-size requirements. Background removal (powered by the ISNet model) strips whatever's behind you and replaces it with the exact color your country requires. You can also manually tweak brightness, contrast, and crop position.

**Download and print.** The tool generates a print-ready layout at 300 DPI — formatted for standard 4x6 photo paper. Take the file to any pharmacy or drugstore, print it as a regular photo for about $0.35, and you've got your passport photos.

As one Reddit commenter put it: most people don't realize you can take a print-ready file to any drugstore instead of using their $15–$20 passport photo service for basically the same thing.

## The Privacy-First Architecture

Here's what makes PassportPhotoSnap different from the dozens of other passport photo websites: your photo never leaves your device.

Most competing services upload your photo to their servers for processing, then charge you to download the result. PassportPhotoSnap runs entirely client-side using ONNX Runtime for the ML models. The face detection, background removal, and image processing all happen in your browser through WebAssembly. There's no backend server. No database. No account creation.

This matters because passport photos are literally government ID images. Uploading them to random servers — many of which have unclear data retention policies — is a genuine privacy risk that most people don't think about.

One commenter on the Reddit thread nailed it: client-side processing with ONNX Runtime is the right approach for privacy-sensitive use cases like this. People are rightfully skeptical about uploading personal photos to random servers.

## How the AI Works Under the Hood

The tool runs two main AI models directly in the browser:

**Face detection** identifies the face in your photo, calculates its position and size, and auto-centers it according to the specific country's requirements. Different countries have different rules about how large your head should appear and where it should be positioned.

**Background removal** uses the ISNet model — a deep learning architecture designed for salient object detection. It identifies the person in the photo, removes everything behind them, and fills in the required background color. All of this runs through ONNX Runtime compiled to WebAssembly, so it works on any modern browser without plugins or installations.

The technical achievement here is worth noting: running production-quality ML models in a browser tab with no server infrastructure is the kind of approach that makes free tools actually sustainable. There's no hosting cost per user, no API billing, no scaling concerns.

## The Business Model (There Isn't One)

PassportPhotoSnap is completely free. No hidden fees, no premium tiers, no watermarks, no "pay to download HD" upsell. When Reddit users asked about monetization plans, the creator's approach was straightforward: no ads, no data collection, just a free tool.

This raised a fair question from commenters: how does a free tool with no ads make money? The answer, at least for now, appears to be that it doesn't need to. With no server costs (everything runs client-side), the only expense is the domain name. It's the kind of project that's only possible because of the shift toward in-browser ML inference.

## What Users Are Saying

The Reddit response was overwhelmingly positive. Users from multiple countries confirmed it works correctly for their specific passport requirements. One user reported completing a US passport photo in about 2 minutes.

Not everyone was convinced it would be accepted everywhere, though. A commenter from Germany pointed out that their passport system requires photos to be transferred with end-to-end encryption through specific channels. A UK commenter noted that their passport office already offers a similar upload-and-crop tool on the official government website.

These are valid points — the tool works perfectly for countries that accept printed photos (which is still most of them), but some countries are moving toward digital-only submission pipelines.

## Key Takeaways

**1. Personal frustration is the best product validation.** The creator didn't do market research or run surveys. They got ripped off, got annoyed, and built something. That's how you know the problem is real.

**2. Client-side AI eliminates the cost-of-serving problem.** By running models in the browser, there are zero marginal costs per user. No API calls, no server scaling, no cloud bills. This is a model more builders should study.

**3. Privacy can be a feature, not just a checkbox.** In an era where every photo app wants to upload your images, "your photo never leaves your device" is a genuine differentiator.

**4. Free tools spread through word of mouth.** The suggestion from one Reddit commenter was spot-on: passport photo tools spread heavily through travel forums, expat communities, and visa groups. A free, no-signup tool is exactly the kind of thing people share.

**5. Specificity wins over generality.** PassportPhotoSnap doesn't try to be a general photo editor. It does one thing — passport photos — and nails every detail, from country-specific specs to print-ready layouts. That focus is why it works.
