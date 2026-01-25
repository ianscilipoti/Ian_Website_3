---
projectId: Painter
title: Painter
description: An automatic painting algorithm using simulated brush strokes
previewImg: preview.png
skills: [Simulation, Generative Art, Processing]
order: 8
color: green
date: 2016
---
The painter project was an early experiment in the processing framework/language. The goal was an algorithm that could paint. The paintings should be more than just some filters but rather a series of brush strokes. 
<div style="padding:55% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/636471719?h=dd0a616918&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="painter_demo.mp4"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

<br>

How It Works
---

Internally, the project has a framework of a basic painting built in. This includes different brushes, different brush sizes, and the ability to specify a brush stroke. 

![A painting of a pond](./paintedpond.png)

The program creates random brush strokes and applies them to the canvas. After each stroke, the canvas is compared to the goal image. If the recently added stroke made the canvas more similar to the goal image, it is kept. Otherwise the stroke is undone and a new stroke is generated.  

![A painting of a lake](./paintedlake.png)


