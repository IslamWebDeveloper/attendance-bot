const login = async (page) => {

    await page.goto("https://techsup-erp.com/web/login", {
        waitUntil: "networkidle"
    });

    await page.fill(
        'input[name="login"]',
        process.env.USERNAME
    );

    await page.fill(
        'input[name="password"]',
        process.env.PASSWORD
    );

    await page.click('button[type="submit"]');

    await page.waitForLoadState("networkidle");

}

module.exports = login;