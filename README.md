# party-as-a-service

Bespoke party for your Slack.

## Demo

https://labs.mgdm.net/party/

I am bad at LetsEncrypt so the cert might expire from time to time.

## The GIFs are too big for Slack!

No problem. Install [gifsicle](https://www.lcdf.org/gifsicle/) with your package manager of choice, and do

```bash
gifsicle -O3 --colors 256 -i theOutputFromThisThing.gif -o OptimizedOutput.gif
```

## Todo

- [ ] Figure out why you sometimes need to drag the image on twice
- [ ] Optimise the output so they're always less than 64KB in size, as this is important for Slack.

