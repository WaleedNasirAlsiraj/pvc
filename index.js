import fs from "fs";
import prompt from "prompt";
import { Builder, By, until, Select } from "selenium-webdriver";

const start = async () => {
  console.log("🚀 Starting the process...");

  let promptData = {
    username: "",
    password: "",
    fromDate: "",
    toDate: "",
  };

  prompt.start();

  await new Promise((resolve, reject) => {
    prompt.get("username", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      promptData.username = result.username;
      resolve();
    });
  });
  console.log("👤 Username entered.");

  await new Promise((resolve, reject) => {
    prompt.get("password", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      promptData.password = result.password;
      resolve();
    });
  });
  console.log("🔑 Password entered.");

  let driver = await new Builder().forBrowser("chrome").build();

  try {
    await driver.get("https://campus.vu.edu.pk/Login.aspx");
    console.log("🔒 Logging into VU Campus...");

    let username = await driver.findElement(By.id("txtUsername"));
    await username.sendKeys(promptData.username || "pgjw04fee");

    let pass = await driver.findElement(By.id("txtPassword"));
    await pass.sendKeys(promptData.password || "Pakistan123*");

    let btn = await driver.findElement(By.id("btnLogin"));
    await btn.click();

    await driver.get(
      "https://campus.vu.edu.pk/FeeManagement/PVCChallanList.aspx"
    );

    let option = await driver.findElement(By.id("rblOptions_1"));
    await option.click();

    prompt.start();
    console.log("📅 Please enter From Date...");
    await new Promise((resolve, reject) => {
      prompt.get("fromData", (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        promptData.fromDate = result.fromData;
        resolve();
      });
    });

    console.log("📅 Please enter To Date...");
    await new Promise((resolve, reject) => {
      prompt.get("toDate", (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        promptData.toDate = result.toDate;
        resolve();
      });
    });

    let studentIds = [];
    let useSavedIds = false;
    let useSavedChallanData = false;

    console.log("💾 Do you have a file with student IDs? (yes/no/skip)");

    await new Promise((resolve, reject) => {
      prompt.get("useSavedIds", (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (result.useSavedIds.toLowerCase() === "yes") {
          useSavedIds = true;
          resolve();
        } else if (result.useSavedIds.toLowerCase() === "skip") {
          useSavedIds = result.useSavedIds.toLowerCase();
          resolve();
        } else {
          resolve();
        }
      });
    });

    if (useSavedIds !== "skip") {
      if (useSavedIds) {
        console.log("📁 Please provide the path to the file:");
        await new Promise((resolve, reject) => {
          prompt.get("filePath", (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            try {
              studentIds = JSON.parse(fs.readFileSync(result.filePath));
              console.log(
                `✅ Student IDs loaded from file: ${result.filePath}`
              );
            } catch (error) {
              console.error("❌ Error reading file:", error.message);
            }
            resolve();
          });
        });
      } else {
        let fromData = await driver.findElement(By.id("txtMarkDate_From"));
        await fromData.sendKeys(promptData.fromDate || "12/1/2023");

        let toData = await driver.findElement(By.id("txtMarkDate_To"));
        await toData.sendKeys(promptData.toDate || "12/1/2024");

        await driver.findElement(By.id("btnShow")).click();

        let dropDown = await driver.findElement(By.id("ddlRecords"));
        let select = new Select(dropDown);

        console.log("🔍 Searching for students...");

        await select.selectByValue("1000");

        let sort = await driver.findElement(
          By.xpath("//th[@scope='col']/a[contains(@href,'Sort$IsMarked')]")
        );
        await sort.click();

        let rows = await driver.findElements(By.css("#gvShow tbody tr"));
        studentIds = await RowsMap(rows);
      }
    }
    if (useSavedIds !== "skip") {
      console.log("💾 Do you have a file with challanData? (yes/no)");

      await new Promise((resolve, reject) => {
        prompt.get("useSavedChallanData", (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          if (result.useSavedChallanData.toLowerCase() === "yes") {
            useSavedChallanData = true;
            resolve();
          } else {
            resolve();
          }
        });
      });
    }

    let challan;

    if (!useSavedChallanData && useSavedIds !== "skip") {
      challan = await StudentAccountBook(driver, studentIds);
    } else {
      console.log("📁 Please provide the path to the challanfile:");
      await new Promise((resolve, reject) => {
        prompt.get("filePath", (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          try {
            challan = JSON.parse(fs.readFileSync(result.filePath));
            console.log(`✅ Student IDs loaded from file: ${result.filePath}`);
          } catch (error) {
            console.error("❌ Error reading file:", error.message);
          }
          resolve();
        });
      });
    }

    await MarkChallan(driver, challan);

    console.log("✅ Done!");

    await driver.get("https://i.giphy.com/xT9IgFXbD1smKi1IHe.webp");
  } catch (err) {
    console.error("❌ Error occurred:", err);
  } finally {
    await driver.quit();
  }
};

start();

const RowsMap = async (rows) => {
  let studentIds = [];
  let hasChecked = false;
  let encounteredIds = new Set();

  for (const row of rows) {
    try {
      let lastTd = await row.findElement(By.xpath("./td[last()]/span/img"));
      let imgSrc = await lastTd.getAttribute("src");

      if (imgSrc === "https://campus.vu.edu.pk/Images/cross.png") {
        let studentIdElement = await row.findElement(By.xpath("./td[3]/span"));
        let studentId = await studentIdElement.getText();
        // Check if studentId already encountered
        if (!encounteredIds.has(studentId)) {
          studentIds.push(studentId);
          encounteredIds.add(studentId); // Add to encountered set
          console.log(`👀 Found student ID ${studentId}`);
        }
      } else if (imgSrc === "https://campus.vu.edu.pk/Images/check.png") {
        hasChecked = true;
        break;
      }
    } catch (error) {
      console.log("❌ Error processing row:", error.message);
    }
  }

  if (hasChecked) {
    console.log("✅ Found student with check, moving to the next step...");
    console.log(`✅ Found ${studentIds.length} students`);
    console.log("💾 Saving student IDs to file...");

    try {
      fs.writeFileSync("studentIds.json", JSON.stringify(studentIds));
      console.log("✅ Student IDs saved to file: studentIds.json");
    } catch (error) {
      console.error("❌ Error saving file:", error.message);
    }
    return studentIds;
  } else {
    console.log("✅ All students processed, moving to the next step...");
    return studentIds;
  }
};

const StudentAccountBook = async (driver, studentIds) => {
  const challanData = [];

  await driver.get(
    "https://campus.vu.edu.pk/FeeManagement/StudentAccountBook.aspx"
  );

  const settings = {
    time: 0,
    date: "",
  };

  prompt.start();

  console.log("📅 Please enter the date...");
  await new Promise((resolve, reject) => {
    prompt.get("date", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      settings.date = result.date;
      resolve();
    });
  });

  console.log("⏰ Please enter the time...");
  await new Promise((resolve, reject) => {
    prompt.get("time", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      settings.time = result.time;
      resolve();
    });
  });

  for (const studentId of studentIds) {
    let input = await driver.findElement(By.id("txtstudentid"));
    let btnShow = await driver.findElement(By.id("btnshow"));
    await input.clear();
    await input.sendKeys(studentId);

    await btnShow.click();

    try {
      // Wait for the table to load
      await driver.wait(
        until.elementLocated(By.id("grdaccountbook")),
        parseInt(settings.time) || 500
      );

      let tableRows = await driver.findElements(
        By.css("#grdaccountbook .txt.tblrow")
      );

      for (const row of tableRows) {
        let challanIdElement = await row.findElement(By.xpath("./td[1]/span"));
        let challanId = await challanIdElement.getText();

        let voucherPeriodElement = await row.findElement(
          By.xpath("./td[3]/span")
        );
        let voucherPeriod = await voucherPeriodElement.getText();

        // Check if voucher period matches and the payment is unpaid
        if (voucherPeriod === settings.date) {
          challanData.push({
            studentId: studentId,
            challanId: challanId,
          });
          console.log(
            `✅ Found challan for student ${studentId} - Challan ID: ${challanId}`
          );
        }
      }
    } catch (error) {
      console.log(`❌ Error finding challan for student ID ${studentId}`);
      continue; // Move to the next student ID
    }
  }

  try {
    fs.writeFileSync("challanData.json", JSON.stringify(challanData));
    console.log("✅ challanData saved to file: challanData.json");
  } catch (error) {
    console.error("❌ Error saving file:", error.message);
  }

  return challanData;
};

const MarkChallan = async (driver, challan) => {
  await driver.get(
    "https://campus.vu.edu.pk/FeeManagement/PVCMarkChallan.aspx"
  );

  console.log("💵 Please enter the Paid Date...");
  let date;

  prompt.start();

  await new Promise((resolve, reject) => {
    prompt.get("PaidDate", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      date = result.PaidDate;
      resolve();
    });
  });

  for (let i = 0; i < challan.length; i++) {
    let { studentId, challanId } = challan[i];
    console.log(
      `🔍 Marking challan for student ${i + 1} of ${
        challan.length
      }: ID ${studentId}, Challan ID ${challanId}`
    );

    let studentIdInput = await driver.findElement(By.id("txtStudentId"));
    await studentIdInput.clear();
    await studentIdInput.sendKeys(studentId);

    let challanIdInput = await driver.findElement(By.id("txtChallanId"));
    await challanIdInput.clear();
    await challanIdInput.sendKeys(challanId);

    let paidDateInput = await driver.findElement(By.id("txtPaidDate"));
    await paidDateInput.clear();
    await paidDateInput.sendKeys(date);
    await driver.findElement(By.id("btnMark")).click();

    console.log(
      `✅ Challan marked for student ID ${studentId} and challan ID ${challanId}`
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};
