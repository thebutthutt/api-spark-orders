# File Structure

## Current

All server files located in `/srv/`

-   `/srv/api/` backend api
-   `/srv/react-spark/` react front end source files
    -   `/srv/react-spark/build/` frontend build used for production server
-   `/srv/production/` production instance of backend server

## Leftovers

there may still be some stuff left in `/home/hcf0018/webserver/` from the original development phase, but this is all old and unused and will most likely be deleted once my account is deactivated :(

# Process Manager (PM2)

Both the production server and the database processes are managed by `PM2` because it makes life so much easier!

**All pm2 commands must be run with sudo!!!**

If you run without sudo it will work, but it won't show you the server processes because the process list is unique to the user, and the root user controls the server processes

## Server and Database Processes

-   `react-spark` The production server (actually the node/express api; running in `/srv/production/`)
-   `mongod` The database process
