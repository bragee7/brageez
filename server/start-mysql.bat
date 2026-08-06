@echo off
REM Start MySQL 8.4 with the non-default datadir (contains a space)
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="C:\ProgramData\MySQL\MySQL Server 8.4\Data" --port=3306 --log-error="C:\Users\Gauth\Documents\project_br\zdb\server\mysql.err.log" --pid-file="C:\Users\Gauth\Documents\project_br\zdb\server\mysql.pid"
