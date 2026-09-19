import asyncio
import httpx
import time

async def hit_health_check(client, run_id):
    start = time.time()
    resp = await client.get('http://localhost:8000/')
    elapsed = time.time() - start
    print(f'Health check {run_id}: {elapsed:.3f}s')
    assert elapsed < 1.0, "Health check was blocked!"

async def heavy_remediate(client, i):
    payload = {
        'risk_label': 'Critical',
        'flagged_issues': ['Test'],
        'top_contributing_factors': {'x': 1.0}
    }
    await client.post('http://localhost:8000/remediate', json=payload)

async def main():
    async with httpx.AsyncClient() as client:
        # Fire 10 remediate calls concurrently (these take a few seconds each on Groq)
        tasks = [heavy_remediate(client, i) for i in range(10)]
        
        # Fire the tasks
        future = asyncio.gather(*tasks)
        
        # While they are running, hit the health check multiple times
        for i in range(3):
            await asyncio.sleep(0.5)
            await hit_health_check(client, i)
            
        await future

if __name__ == '__main__':
    asyncio.run(main())
    print('Async flood test passed: Non-blocking I/O verified.')


