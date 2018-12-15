import { writeFile } from "fs-extra";
import { get } from "https";
import { StringDecoder } from "string_decoder";



function downloadFile(url: string) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder("utf8");
    let res = "";

    get(url, response => {
      response.on("data", data => {
        res += decoder.write(data);
      });

      response.on("end", () => {
        resolve({ data: res, statusCode: response.statusCode });
        decoder.end();
      });

      response.on("error", reject);
    });
  });
}

downloadFile(
  "https://raw.githubusercontent.com/mui-org/material-ui/master/packages/material-ui/src/index.jsa"
)
  .then(file => writeFile("test.js", file.data))
  .catch(e => {
    console.error(e);
  });
