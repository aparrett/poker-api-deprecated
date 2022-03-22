# poker-api

An app where you can play Texas Hold'em poker with your friends. Click [here](https://poker-friends.herokuapp.com/) to play.

## Tech Stack

-   Node.js
-   Express
-   MongoDB
-   Jest

## Project setup

```
npm install
```

### Run the server

```
npm run dev
```

### Run your lint and tests

```
npm run test
```

### Local Database Setup

These are the Mac instructions for setting up the database in your local. The Windows instructions for installing Mongo are to be added later but a quick Google search should do the trick.

1. Install brew if you don't have it already (this takes a while)

```
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

2. Install and Run MongoDb

```
npm install run-rs -g
run-rs -v 5.0.0
```

3. Download the database GUI of your choice to view the data in a more user-friendly way. I recommend Robo 3T.
   https://robomongo.org/download

- Click 'Create' to create a new connection (use the defaults).
- Click Save
- Click Connect

On the first run, there won't be anything in the database. Once you start adding things in the application, those collections will show up.

## How to Contribute

1. Install Git on your machine.
   https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

2. Fork the repository to your own account.

3. Clone the repository into your projects folder on your computer.

`git clone https://github.com/<your-user-name>/poker-api.git`

3. Make your changes to the code. Feel free to create new branches if you would like but it is not necessary at this point.
4. Commit your code with a thoughtful message.

`git commit -am 'Added the ability to shuffle cards'`

5. Push to your repository.

`git push`

6. Create a pull request.

-   Go to the [original repository](https://github.com/aparrett/poker-api) and click the "New Pull Request" button.
-   Follow the steps.

7. Once the code is reviewed, it will be merged into master on the original repository.

## Known Issues

* Restarting the server makes a user's hand disappear until they refresh their browser.
* The styles are not responsive.
* Because the app is on Heroku and I'm not paying for the live server, the UI and API take serveral seconds to boot up.

## To-Do

Send me an email at `anthonyparrett7@gmail.com` for an invite to the [Trello board](https://trello.com/b/pBbdpTSe/appstories) where I am tracking the to-do list.
