---
title: "Coding Al Brooks Price Action: Identifying a Strong Buy Signal Bar with Python"
description: "How to mathematically define and code a high-probability bullish signal bar using quantitative market data and Pandas."
pubDate: "May 31 2026"
heroImage: '../../assets/blog-placeholder-about.jpg'
---

In Al Brooks Price Action, a **Buy Signal Bar** is the trigger that tells a trader that buyers are aggressively pushing the price up, often leading to a bullish continuation or a reversal. 

As Quants, we don't just look for a green candle; we want to see strong **institutional urgency**. That means a large bullish body that closes very close to its high, leaving bears trapped.

---

## The Mathematical Logic of a Buy Signal Bar

To filter out weak or fake bullish moves, a high-quality Al Brooks Buy Signal Bar must satisfy two strict quantitative conditions:

1. **Bullish Body Dominance:** The body (Close - Open) must be at least 50% or more of the candle's total range (High - Low).
2. **Minimal Upper Shadow:** The close must be within the top 20% of the candle's total range, showing that bulls maintained control right until the last second.

### The Formulas:

$$\text{Total Range} = \text{High} - \text{Low}$$
$$\text{Body Size} = \text{Close} - \text{Open}$$
$$\text{Upper Tail} = \text{High} - \text{Close}$$

A valid Buy Signal Bar must return `True` for:

$$\text{Body Size} \ge (\text{Total Range} \times 0.50) \quad \text{AND} \quad \text{Upper Tail} \le (\text{Total Range} \times 0.20)$$

---

## Python Code Implementation

Here is how you can build an automated scanner using **Pandas** to detect these strong institutional buy triggers in historical price action data:

```python
import pandas as pd
import numpy as np

def detect_buy_signal_bars(df, body_min_ratio=0.50, tail_max_ratio=0.20):
    """
    Scans market data to identify high-probability Al Brooks Buy Signal Bars.
    """
    total_range = df['High'] - df['Low']
    # Avoid division by zero
    total_range = np.where(total_range == 0, 0.00001, total_range)
    
    body_size = df['Close'] - df['Open']
    upper_tail = df['High'] - df['Close']
    
    # Condition 1: Must be a green bar with a dominant body
    strong_body = body_size >= (total_range * body_min_ratio)
    
    # Condition 2: Close must be near the absolute high
    weak_upper_tail = upper_tail <= (total_range * tail_max_ratio)
    
    # Combine both rules
    df['buy_signal'] = strong_body & weak_upper_tail
    
    return df

# Mockup market data representing a reversal sequence
market_data = {
    'Open':  [150.00, 148.50, 146.00],
    'High':  [152.00, 149.00, 151.50],
    'Low':   [147.00, 145.00, 145.50],
    'Close': [148.00, 146.20, 151.20] # Last row is a strong Buy Signal Bar
}

df = pd.DataFrame(market_data)
df = detect_buy_signal_bars(df)
print(df[['Close', 'buy_signal']])