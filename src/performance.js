// src/performance.js
export default class PerformanceOptimizer {
  constructor(options = {}) {
    this.intersectionObserverOptions = {
      root: options.root || null,
      rootMargin: options.rootMargin || '0px',
      threshold: options.threshold || 0.1
    };
    this.intersectionObserver = null;
  }

  observeElements(selector, intersectionCallback) {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.intersectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          intersectionCallback(entry, observer);
        }
      });
    }, this.intersectionObserverOptions);

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
        // console.warn(`PerformanceOptimizer: No elements found for selector "${selector}" to observe.`);
        return;
    }
    elements.forEach(el => this.intersectionObserver.observe(el));
    // console.log(`PerformanceOptimizer: Observing ${elements.length} elements with selector "${selector}".`);
  }

  disconnectObserver() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
      // console.log('PerformanceOptimizer: IntersectionObserver disconnected.');
    }
  }

  createVirtualListConfig(items, itemHeight, containerHeight, bufferItems = 5) {
    if (!Array.isArray(items) || typeof itemHeight !== 'number' || itemHeight <=0 || typeof containerHeight !== 'number' || containerHeight <= 0) {
      console.error('PerformanceOptimizer: Invalid parameters for createVirtualListConfig.', {items, itemHeight, containerHeight});
      // Return a dummy config to prevent errors in consumer code, or throw error
      return {
        items: [], itemHeight: 1, containerHeight: 1, totalHeight: 0, visibleItemsCount: 0, bufferItems: 0,
        getRenderedItemsInfo: () => ({ startIndex: 0, endIndex: -1, visibleItems: [], paddingTop: 0, paddingBottom: 0 })
      };
    }

    const totalHeight = items.length * itemHeight;
    const visibleItemsCount = Math.ceil(containerHeight / itemHeight);

    return {
      items,
      itemHeight,
      containerHeight,
      totalHeight,
      visibleItemsCount,
      bufferItems, // Number of items to render above/below the visible area

      getRenderedItemsInfo: function(scrollTop) {
        const effectiveScrollTop = Math.max(0, scrollTop); // Ensure scrollTop isn't negative

        // Calculate the start index of the visible window without buffer
        const startIndexUnbuffered = Math.floor(effectiveScrollTop / this.itemHeight);

        // Calculate the end index of the visible window without buffer
        const endIndexUnbuffered = Math.min(
          startIndexUnbuffered + this.visibleItemsCount -1, // -1 because it's an index
          this.items.length - 1
        );

        // Apply buffer
        const startIndex = Math.max(0, startIndexUnbuffered - this.bufferItems);
        const endIndex = Math.min(this.items.length - 1, endIndexUnbuffered + this.bufferItems);

        const visibleItems = this.items.slice(startIndex, endIndex + 1);

        const paddingTop = startIndex * this.itemHeight;
        const paddingBottom = Math.max(0, (this.items.length - (endIndex + 1)) * this.itemHeight);

        return {
          startIndex,
          endIndex,
          visibleItems,
          paddingTop,
          paddingBottom,
        };
      }
    };
  }

  debounce(func, wait, immediate = false) {
    let timeout;
    return function() {
      const context = this, args = arguments;
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
}
