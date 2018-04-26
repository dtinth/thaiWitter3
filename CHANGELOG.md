# Change Log

Most of the change log has been lost.

## 2013-12-07: [v3.1.2](https://twitter.com/dtinth/status/409016259247104000)

- Fixed auto-completion data loading.
- Added "Lists" tab in options.

## 2013-06-11: [v3.1.1](https://twitter.com/dtinth/status/344145687707009026)

- Tweet template: <kbd>Ctrl+Alt+T</kbd>. Useful when tweeting in an event, and you want to always have a hashtag at the end of tweet. (@icez)

## 2013-06-10: [v3.1.0](https://twitter.com/dtinth/status/344090565631164417)

- Switch to Twitter API 1.1 :(
- Support Thai Hashtags

## 2012-12-13: [v3.0.10](https://twitter.com/dtinth/status/279223189689745411)

- Do not display notifications for filtered tweets. ([@tannce](https://twitter.com/tannce/status/249839873123577857))
- Always display mentions, even if it's filtered by exclude keywords. ([@tannce](https://twitter.com/tannce/status/249868423604092928))
- Update server to Node 0.8 and latest Express 3 and Connect 2.
  - Use [Q](https://github.com/kriskowal/q) to help clean up code on the server side instead of callback pyramids.
  - Please report problems to [@dtinth](https://twitter.com/dtinth).
- For [MT tweets](https://twitter.com/dtinth/status/279138453344641024) (like RT but modifying some text), added an option to "guess" the original tweet. (@dtinth)
  - This experimental feature is experimental. It is not guaranteed that #thaiWitter will always guess the correct original tweet.
  - Powered by [levenshtein](https://npmjs.org/package/levenshtein).

## 2012-07-15: [v3.0.9](https://twitter.com/dtinth/status/224531047252099072)

- Removed the Install button, always show the Clear button instead. The Install button doesn't work already anyway. ([@icez](https://twitter.com/icez/status/224181511925137408))

## 2012-05-21: [v3.0.8](https://twitter.com/dtinth/status/204514630209511425)

- Press <kbd>Ctrl+Alt+Z</kbd> to undo your latest tweet. ([@Legatte](https://twitter.com/#!/dtinth/status/203495358813323264))

## 2012-05-13: [v3.0.7](https://twitter.com/dtinth/status/201692453915467776)

- data-username attributes are now always "lowercase". (for custom CSS)

Few custom CSS:

- To select a status that is posted by dtinth, use **.status[data-username="dtinth"]**
- To select a mention to @dtinth, use **.status-link-this-is-new[data-username="dtinth"]**

## 2012-05-12: [v3.0.6](https://twitter.com/dtinth/status/201191092954202112)

- Add an option to bypass t.co when visiting links, due to Thailand's Ministry of Information and Communication Technology blocking t.co from time to time. ([@LXZE](https://twitter.com/LXZE/status/200958873992040448))
- Add the following data-attributes to a status element, for Custom CSS styling purposes: *
  - [data-username] indicates the username of the tweeter.
  - [data-user] indicates the user ID of the tweeter.

\* That way, I can set a color label of a tweet based, on the user who posted it, inspired by [twicca](https://play.google.com/store/apps/details?id=jp.r246.twicca&hl=en), using this custom CSS:

    .status[data-username="dtinth"] { -moz-box-shadow: inset 3px 0 rgba(200,240,255,0.3); }

## 2012-05-04: v3.0.5

- Don't consider the tweet a reply when it looks like a retweet.
- Ctrl+Alt+Y to clear the green selection (forget what status it is replying to).

## 2012-04-15: [v3.0.4](https://twitter.com/dtinth/status/191557844829614080)

- Fix RT API not working, because of new feature in 3.0.3. ([@tannce](https://twitter.com/#!/tannce/status/191552651337543680))

## 2012-04-15: v3.0.3

- Allow the reply target username to appear anywhere in the tweet to consider it as a proper @Reply. ([@tannce](https://twitter.com/tannce/status/191404351712010240))

## 2012-03-22: v3.0.2

- Default settings changed:
  - Refresh Rate: 60 seconds
  - Show In Reply To: enabled by default
  - Media Preview: enabled by default
  - Notification Pictures: enabled be default

## 2012-03-16: 3.0.1

- Minor fixes.

## 2012-03-01: 3.0.0

- Moved from a shared hosting provider to become hosted on Heroku.
