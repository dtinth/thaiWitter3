
thaiWitter
==========

**thaiWitter** is a web-based Twitter client that I have written back in 2009, when I was 16 years old. It is one of my first project of considerable size (codebase is more than 7000 lines).

I have got several happy users who gave me a lot of great feedback for me to improve it. I felt really good about improving this project. They are mentioned in the [Changelog](CHANGELOG.md) page.

But back at that time I lacked software engineering skills. I just threw a bunch of things I learned into this project. So, the project becomes less maintainable, and eventually, I stopped maintaining it in 2013 due to its immense technical debt.

Nevertheless, it’s still up running on Heroku to this day! In fact, I still use it occasionally. If you want to try it: https://tw3.herokuapp.com/

Now, in 2018, I am open-sourcing this project for posterity. I don’t have a plan to update it further yet, but feel free to fork this project!

<p align="center">
  <img src="public/thaiWitter.png">
</p>

## Features

Here is a list of feature with some (edited/paraphrased) testimonials (text in brackets are my interpretations).

- **Super smooth!** A lot of animation in this app. The aim is to create a Twitter client with a fast and responsive UI. It runs at 45fps in Firefox 3. It has a [custom scrolling equation](http://me.dt.in.th/page/thaiWitterScrollingEquation) to ensure the smoothest timeline scrolling experience!

  > [thaiWitter runs on Prism, an ancient technology, but it’s just the best Twitter client...](https://twitter.com/notnonene/status/453873974343000064) (Mozilla Prism is discontinued since 2010, this tweet is in 2014.)
  >
  > [Some people asked me, isn’t it cumbersome to use Twitter on the web? I answered, no, because I use thaiWitter.](https://twitter.com/minxkung/status/350082128253427712)
  >
  > [Temporarily switched to thaiWitter. This computer has a low spec and this is the smoothest client.](https://twitter.com/AdmOd/status/124538495908843521)

- **Real-time streaming** — With Twitter Stream API, new tweets gets displayed instantly. This makes Twitter feel very much like a chat room, so you can keep on tweeting! Requires an [extension](https://github.com/dtinth/twclient2) to be able to do streaming.

  > [thaiWitter is so great for enjoying TV dramas \[together\], even better than a chat room!](https://twitter.com/Mameaw14/status/361142814265974785) [I just hit my API rate limit.](https://twitter.com/Mameaw14/status/361802052696948736)
  >
  > [You can’t answer to tweets that fast because you are not using thaiWitter. Seriously!](https://twitter.com/minxkung/status/343737174799314944)
  >
  > [thaiWitter is so great for tweeting in bursts!](https://twitter.com/AliceSenzeXZ/status/172018990019907584)

<p align="center">
  <img src="docs/images/screenshot1.png" width="405">
</p>

- **Simple dark theme.** Designed for readability, I used a simple dark theme with a font that’s optimized for easy reading on screen (Verdana).

  > [thaiWitter is easy on the eyes when you’re in the dark.](https://twitter.com/Mameaw14/status/274179800858513408)

- **Natural reading flow.** When you read books, you read from top-to-bottom. thaiWitter puts newer tweets at the bottom too, so you can follow the flow of the conversation in a natural way.

  > [In the end I had to switch back to thaiWitter. It’s faster and it’s easier to read.](https://twitter.com/notnonene/status/313354096960737280) (after switching to MetroTwit)

- **Keyboard based.** You can tweet, favorite, reply, retweet, view threads, view images, and so on... all using keyboard.

  > [I’ll just use thaiWitter then. It’s most comfortable to use, I remembered all the keyboard shortcuts!](https://twitter.com/tannce/status/129574219548860416)

- **Desktop notifications** — Get notified even when you’re working on something else. Doesn’t work anymore because it relies on the old `webkitNotifications` API from 2010.

- **Show Client** — See who uses what to post to Twitter.

- **Auto Scrolling** — Auto scroll to the bottommost tweet when loaded.

<p align="center">
  <img src="docs/images/screenshot2.png" width="405">
  <img src="docs/images/screenshot3.png" width="405">
</p>

- **Image Preview** — View images in tweets without leaving thaiWitter.

- **View Conversation** — Press <kbd>Shift+Enter</kbd> on a tweet to view a conversation.

- **User/List Timeline** — Press <kbd>Ctrl+U</kbd> and type in the `username` or `username/list-slug` to view it.

- **List Updates Timeline** — Press <kbd>Ctrl+U</kbd> and type in the `username/list-slug!` to view only the latest tweet of each member in the list, sorted chronologically. Very useful if you have a list of your friends and want to see what they up to after you haven’t used Twitter for a while.

- **Retweeting** — thaiWitter supports retweeting, years before Twitter finally implemented it. You can even retweet private tweet or even direct messages (but it will give you a warning.)

  - **Mutated tweet (MT)** — In Thai Twitter culture around that time, it’s common to retweet someone, but modify the text a bit for humorous effect. thaiWitter has a feature to track down the original tweet.

- **Undo Tweet** — Press <kbd>Ctrl+Z</kbd> after tweeting to delete it tweet and put the tweet text back into the input box.

  > [Sending tweet failed? No problem — I use thaiWitter.](https://twitter.com/ArCHavenSZ/status/538387267262238720)

  > [Just made a mistake in last tweet. Thanks to thaiWitter’s Undo Tweet feature, I can fix it instantly.](https://twitter.com/Legatte/status/204531139766009856)

<p align="center">
  <img src="docs/images/screenshot4.png" width="416">
  <img src="docs/images/screenshot5.png" width="416">
</p>

- **Keyword Highlight** — You can put in a list of keywords (including usernames), and they will be highlighted in blue.

  > [“I like thaiWitter — it highlights the tweets from people I care about”](https://twitter.com/9terz/status/505757754917527552)

- **Mention Highlight** — Tweets that mention your name will be highlighted in red.

- **Filter Keywords** — Filter out some keywords from your timeline.

- **Hardcode Mode** — Removes the top bar and tweet input area at the bottom (you have to remember the keyboard shortcut). Start typing to activate the tweet input box.

- **Smart Username Autocomplete** — Completes the user name as you type. It uses an algorithm to determine who you might want to tweet to the most, and rank the suggestions accordingly.

- **Custom CSS** — Allows you to put your own CSS to customize the UI. Examples: [\[1\]](https://twitter.com/dtinth/status/149421023865995264) [\[2\]](https://twitter.com/Pickyzzz/status/133569991814549504)

- **Lots of easter eggs.** Can you find them all?

## Tech stuff

You are looking at a code that’s more than 5 years old...

### Client

- **No 3rd party frontend framework.** I manage all DOM elements manually, but this gave me complete control of DOM animations, which allowed me to optimize the performance as I wish. (Back at that time, it’s very hard to create smooth animations. CSS transitions and animations didn’t exist back then.) It can handle up to around 10,000 tweets while performing reasonably well, while many other Twitter clients would stutter severely when there are thousands of tweets.

  > [My thaiWitter window contains 6,666 tweets in the timeline but it’s still running smoothly.](https://twitter.com/tannce/status/183194520857485312)

- **3rd party front-end libraries:**

    - [q](https://www.npmjs.com/package/q), a promise library.

    - [underscore](https://www.npmjs.com/package/underscore).

- **Self-written front-end libraries:**

    - [DtJS 2](./client/lib/dtjs2.js), a rewrite of [DtJS](https://github.com/dtinth/DtJS), my web animation framework and utility functions for front-end programming in 2009 era. Provides change observer, DOM node generator, animation system, DOM utilities (element/scrolling/viewport size/position queries, events), AJAX, JSONP, and color manipulation.

    - [twcs](./client/lib/twcs.js), thaiWitter Class System.

    - [T.js](./client/T), my utility library, provides function generators, JSON parser, change observer, digit padder, date formatter/parser, and tweet parser.

- **Frontend code is written in a custom compile-to-JS language**, thaiJS, which adds classes (transpiles to twcs), [method binding](https://github.com/tc39/proposal-bind-operator), [protected and private fields](https://github.com/tc39/proposal-private-fields) to JavaScript. [The compiler](./lib/thaijs/lib/thaiJS.coffee) is written in CoffeeScript and is 260 lines long.

  At first I thought this was a good idea. Back then there is not many JS tooling. JSHint was not released back then. So I only need to create a transpiler and Vim syntax file and that would be it.

  Nowadays, there are many tools like ESLint, Babel, and free modern IDEs that offers JavaScript IntelliSense. They won’t work with thaiJS.

- **6000 lines of code [in one file](client/js/js.thaijs).**

- I even implemented support for touch scrolling in iOS 3.x, which required me to [implement touch handling and momentum scrolling](https://github.com/dtinth/thaiWitter3/blob/1ab365252f05118fdf6c218d8536b2a880814191/client/js/js.thaijs#L5364-L5944) myself, as `-webkit-overflow-scrolling` didn’t exist yet.

- **No automated tests.** This is one of the big reason I cannot keep maintaining this. As I add more feature and code gets more complex, I become less confident in changing code.

- **Lots of monkeypatching.** To avoid changing old code, I try to adopt an approach where I don’t have to modify old code, but writing new code to patch old code at runtime. I thought it would be great. As it turned out, it leads to even harder maintenance.

- **No module system.** Most stuffs are declared as global variables.

### Server

- **Node.js based.**

- **Development server** with server module reloading on each refresh (no need to restart the server. Just save and refresh like PHP).

- **Self-written asset pipeline.** On development, compile on the fly. On production, compile and save in memory, so that the whole app can be served without disk I/O.

## Setup

### Install dependencies

```
npm install
```

### Create an application on Twitter

1. Go here &rarr; https://apps.twitter.com/app/new
    - **Name:** thaiWitter-OSS
    - **Description:** Open source version of thaiWitter
    - **Website:** https://github.com/dtinth/thaiWitter3
    - **Callback URL:** http://localhost:3003/thaiWitter/api/callback

2. Go to **Settings** tab and uncheck **Callback Locking**.

3. Go to **Keys and Access Token** tab.

4. Copy the **Consumer Key** and **Consumer Secret**.

### Configure server environment

Create file `.env` with content:

```
THAIWITTER_CONSUMER_KEY=
THAIWITTER_CONSUMER_SECRET=
```

Put in the value from previous step.

### Run server

```
node server.js
```

### Enter app

http://localhost:3003/

## License

MIT, unless stated otherwise
