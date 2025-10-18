Hi!

This is Elly MUD (Multi-User Dungeon: An online, multiplayer, text-based role-playing game from the pre-internet era)

It is a programming exercise I do every so often when I want to try to understand new technology, first creating it in C/C++ with WinSock way back in college, then again for understanding NodeJS and websockets when those came out, and now most recently, working with copilot and their newly released agents for various LLM's (Mainly Claude Sonnet though)

The goal was to test just how much faster I could get work done given a limited 30ish day (non-consecutive) time-limit of work, while really getting a grasp on the new workflow enhancements that LLM's and agents could provide. It is not meant for production servers, or even as a fully functional product or anything. Just a programming exercise of how many crazy/funny/silly/essential/cool features I could add.

It has a ton of features and is "playable" from the command line, or with your favorite telnet client, or even the provided web-client over websockets. It is fully multi-player and anyone can connect using the web-ui or telnet once the server is running. It is also able to be played from the main process and automatically is flagged as an admin. (Functionality like this can be disabled with parameters, use --help to see the full list of arguments that can be passed)

Many features such as live account transfer from users trying to log in from a new connection, both a console and web based admin interface complete with live account monitoring and taking-over of a users session and giving them temporary access to admin commands while blocking out their input, to a playable telnet snake game. Basically wanted to see how far fetched I could take this project this time, and no-idea was too weird to implement. Seriously, try typing "snake" once you log in.

My main goal was to sort of replicate L&F of [https://www.google.com/search?q=majormud](majormud) and a lot of the functionality will be reminscent of that, such as the variable delay between rooms while moving around depending on "weight" or the agility stat in this case. And the overall feel of the combat system and abilities.

Communication, Administration, Combat, Inventory, Equipment, Stats, NPC aggression tracking (completely passive, passive but will attack back, or aggressive) Spell Effects and Abilities, and a included WebUI for players (and admins) should all be functional, with an easy to extend Command parser, and plenty of provided commands - simply type "help" to see the full list while in game.

To get started, just clone this repo, cd into it, `npm install`, and `npm start`. The server will start and from there you can press various keys to run commands like sending a message to all users, shutting down the server in X minutes, monitoring a user, and much more. There are also various scripts like `npm run start:user` to log right in without the CLI interface.

Admin account password will be requested if starting up for the first time. (Again, this can be turned off with command line options but is turned on by default), which will be the password for the "admin" user. This will also be the password used for logging in as the admin user in the web client. Everything is stored in local sqllite database, and uses standard security practices such as salting and hashing all passwords, RBAC, privledge escalation, detail event and raw user session logging, daily log rotations, and probably a lot more that im forgetting as im writing this readme 6 months after the fact.

If you are reading all of this it's probably to get a rough idea of my coding skills? but I actually wrote very little except fixing small mistakes returned by Claude, and heavy testing features, ocassionaly debugging if something went wrong (like how when Claude didn't really understand singletons in JavaScript very well) which was what I was testing out. (Thats why the Web UI is in plain JS) so please don't use this repo to gauge my front-end skills in particular ^_^ It was more of a server-side exercise and I would have designed a much better frontend WebUI interface in a real world app using an actual framework such as Angular, or libraries like React and Vue.

-Elly

