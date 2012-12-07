# TREV example

To run the example you need node.js and some initalized data into mongodb. The collections are user, rep.
   
Adding init data to mongoDB(located in data directory), test user is admin and password is also admin
	
	mongoimport -d repdb -c user init.js

Run the app

    node app.js
