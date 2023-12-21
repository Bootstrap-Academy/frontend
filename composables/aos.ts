import { ref } from 'vue';

export function setAOSViaParent(
  parentRef: any,
  baseClass: string,
  showClass: string,
  skips: number[] = []
) {
  const callback = (entries: any, observer: any) => {
    entries.forEach((entry: any) => {
      if (entry.isIntersecting) {
        entry.target.classList.add(showClass);
      }
    });
  };

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15,
  };

  const myObserver = new IntersectionObserver(callback, options);

  for (let i = 0; i < parentRef.children.length; i++) {
    if (!!skips.find((index) => index == i)) {
    } else {
      parentRef.children.item(i).classList.add(baseClass);
      myObserver.observe(parentRef.children.item(i));
    }
  }
}

export function setStaggeringAOSViaParent(
  parentRef: any,
  baseClass: string,
  showClass: string,
  skips: number[] = [],
  delayBy: number = 0.25
) {
  const callback = (entries: any, observer: any) => {
    entries.forEach((entry: any) => {
      if (entry.isIntersecting) {
        entry.target.classList.add(showClass);

        if (entry.target.children?.length ?? false) {
          for (let i = 0; i < entry.target.children.length; i++) {
            let skip = false;
            for (let j = 0; j < skips.length; j++) {
              if (i == j) skip = true;
            }

            if (!skip) {
              entry.target.children.item(i).classList.add(showClass);
            }
          }
        }
      }
    });
  };

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15,
  };

  const myObserver = new IntersectionObserver(callback, options);

  myObserver.observe(parentRef);

  for (let i = 0; i < parentRef.children.length; i++) {
    let skip = false;
    for (let j = 0; j < skips.length; j++) {
      if (i == j) skip = true;
    }

    if (!skip) {
      parentRef.children.item(i).classList.add(baseClass);
      parentRef.children.item(i).style.transitionDelay = `${i * delayBy}s`;
    }
  }
}
