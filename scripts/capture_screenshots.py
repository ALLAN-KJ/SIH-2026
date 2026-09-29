import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Set a large viewport to avoid cutting off panels
        page = await browser.new_page(viewport={"width": 1440, "height": 1080})
        
        print("Navigating to frontend...")
        await page.goto("http://localhost:5173")
        
        # Click the "Console" or "Upload PCAP" to go to the passive mode
        await page.wait_for_selector("text=Upload PCAP", timeout=10000)
        await page.click("text=Upload PCAP")
        
        print("Uploading PCAP...")
        pcap_path = os.path.abspath("samples/scenario_moderate_transition.pcap")
        
        # Wait for file input to appear (it's hidden, so wait for it attached)
        file_input = await page.wait_for_selector("input[type='file']", state="attached", timeout=10000)
        if file_input:
            await file_input.set_input_files(pcap_path)
            
            # The UI automatically starts analyzing upon file selection.
            # Wait for results to load by waiting for a text that appears only after loading.
            print("Waiting for results to load...")
            await page.wait_for_selector("text=New Analysis", timeout=30000)
            
            # Wait a bit for animations to complete
            await page.wait_for_timeout(3000)
            
            print("Taking screenshots...")
            
            # 1. Full dashboard
            await page.screenshot(path="samples/screenshot_dashboard.png", full_page=True)
            
            # 2. Risk Score Panel
            # We can select by text or structural classes. 
            # Looking at typical UI, there might be a panel with the word "Security Score"
            # We'll just screenshot the full page since it contains everything, but also try to get specific ones.
            # Let's open the SHAP details if it's in a <details> or similar
            try:
                details_button = await page.query_selector("button:has-text('View Detailed Factors')")
                if details_button:
                    await details_button.click()
                    await page.wait_for_timeout(1000)
            except Exception:
                pass
            
            await page.screenshot(path="samples/screenshot_risk_shap.png", full_page=True)
            
            print("Screenshots saved in samples/")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
