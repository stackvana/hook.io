curl -w "@responseFormat.txt" -o /dev/null -s "http://localhost:9999/Marak/echo"

echo "-----"

curl -w "@responseFormat.txt" -o /dev/null -s "http://echo.hook.io:9999/"

echo "-----"

# curl -w "@curl-format.txt" -o /dev/null -s "http://hook.io/Marak/echo"
# curl -w "@curl-format.txt" -o /dev/null -s "http://google.com"