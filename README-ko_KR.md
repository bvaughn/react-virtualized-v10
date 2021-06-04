# react-window

> 많은 리스트들과 표 데이터들을 효과적으로 렌더링 하기위한 React 컴포넌트

React window는 오직 큰 데이터 세트의 *일부분* 만을 렌더링 하는걸로 작동합니다 (뷰포트를 채울 만큼만). 이는 몇 가지 일반적인 성능 병목 현상을 해결하는 데 도움이 됩니다:

1. 첫 화면 렌더링, 혹은 업데이트를 처리하기 위해 요구되는 일의 양과 시간을 줄여줍니다.
2. DOM 노드들의 over-allocation을 피함으로써 메모리 공간을 줄여줍니다.

[![NPM registry](https://img.shields.io/npm/v/react-window.svg?style=for-the-badge)](https://yarnpkg.com/en/package/react-window) [![Travis](https://img.shields.io/badge/ci-travis-green.svg?style=for-the-badge)](https://travis-ci.org/bvaughn/react-window) [![NPM license](https://img.shields.io/badge/license-mit-red.svg?style=for-the-badge)](LICENSE.md)

## 설치

```bash
# Yarn
yarn add react-window

# NPM
npm install --save react-window
```

## 사용법

[react-window.now.sh](https://react-window.now.sh/) 이 곳에서 더 찾아볼 수 있습니다.

## 관련 라이브러리들

* [`react-virtualized-auto-sizer`](https://npmjs.com/package/react-virtualized-auto-sizer): 가용가능한 공간에 딱 맞게끔 커지고 width와 height 값을 자식들에게 전달하는 HOC 입니다.
* [`react-window-infinite-loader`](https://npmjs.com/package/react-window-infinite-loader): 매우 큰 데이터 세트를 여러개의 덩어리로 분리하고 유저가 스크롤 했을때 just-in-time 로드 될 수 있도록 하는걸 도와줍니다. (e.g. Facebook or Twitter).
* [`react-vtree`](https://www.npmjs.com/package/react-vtree): 큰 트리 구조를 렌더링 하기위해 가볍고 융통성 있는 솔루션입니다. (e.g. file system).

## 자주 묻는 질문들

### `react-window` 와 `react-virtualized`가 무엇이 다른가요?
저는 몇년 전에 `react-virtualized` 을 작성했습니다. 그때는 React와 windowing에 대한 개념을 처음 접해봤어요. 이것 때문에, 저는 나중에 몇가지 후회되는 API 결정을 했어요. 그것들 중에 한가지는 너무 많은 불필요한 요소들과 컴포넌트들을 넣었다는 것입니다. 한번 그러한것들을 오픈 소스 프로젝트에 넣으면, 그것들을 제거하는 것은 유저들을 생각하면 꽤나 고통스럽죠.

`react-window` 은 완전히 새롭게 쓰여진 `react-virtualized` 입니다. 저는 많은 문제들을 해결하거나 많은 use case들을 지원하기위해 크게 노력하진않았어요. 대신에, 저는 패키지를 **작고**<sup>1</sup>, **빠르게** 하는 것에 중점을 두고 만들었습니다. 저는 또한 API (와 문서) 를 최대한 초보자 친화적으로 만들기 위해 많은 노력을 쏟아부었습니다(물론 windowing은 여전히 고급적인 유즈케이스에 한해서).

만약 `react-window` 가 여러분의 프로젝트에 필요하다면, 저는 `react-virtualized` 대신에 강력하게 추천드리고 싶네요. 하지만 만약 당신이 오직 `react-virtualized` 가 제공하는 기능들만 필요하다면, 여기 두가지 옵션이 있습니다:

1. `react-virtualized` 를 사용하세요. (그래도 여전히 많은 성공적인 프로젝트들에 사용되고 있답니다!)
2. 원시적인 `react-window` 컴포넌트를 만들고 당신이 원하는 기능들을 추가하세요. 아마 당신은 그 컴포넌트를 npm에 릴리즈해도 된답니다 (독립적인 스탠드얼론 패키지로요)! 🙂

<sup>1 - `react-virtualized` 리스트를 CRA 프로젝트에 추가하는 것은 gzip 된 빌드 사이즈를 33.5kb 까지 늘릴 수도 있습니다. `react-window` 리스트를 사용한다면 gzip 된 빌드 사이즈가 2kb 미만이랍니다. </sup>

### 리스트나 그리드가 페이지의 100% 만큼의 가로 혹은 세로를 채울 수 있나요?

네, 저는 이 [`react-virtualized-auto-sizer` 패키지](https://npmjs.com/package/react-virtualized-auto-sizer)를 사용하기를 권장드립니다:

<img width="336" alt="screen shot 2019-03-07 at 7 29 08 pm" src="https://user-images.githubusercontent.com/29597/54005716-50f41880-410f-11e9-864f-a65bbdf49e07.png">

참고 [Code Sandbox demo](https://codesandbox.io/s/3vnx878jk5).

### 왜 스크롤할때 리스트가 공백이 되는거죠? 

만약 당신의 리스트가 이러한 모습이라면...

<img src="https://user-images.githubusercontent.com/29597/54005352-eb535c80-410d-11e9-80b2-d3d02db1f599.gif" width="302" height="152">

...그렇다면 당신은 아마도 `style` 파라미터를 사용하는 것을 깜빡하셨을 겁니다. `react-window` 와 같은 라이브러리는 리스트 아이템들의 절대적인 위치에 의해 작동하기때문에 (인라인 스타일을 통해서), 그러니 렌더링할 DOM 엘리먼트에 붙이는 걸 절대로 잊지마세요!

<img width="257" alt="screen shot 2019-03-07 at 7 21 48 pm" src="https://user-images.githubusercontent.com/29597/54005433-45ecb880-410e-11e9-8721-420ff1a153da.png">

### 제 리스트들의 데이터들을 Lazy Load 할 수 있나요?

네, 저는 이 [`react-window-infinite-loader` 패키지](https://npmjs.com/package/react-window-infinite-loader) 사용을 권장드립니다.:

<img width="368" alt="screen shot 2019-03-07 at 7 32 32 pm" src="https://user-images.githubusercontent.com/29597/54006733-653a1480-4113-11e9-907b-08ca5e27b3f9.png">

참고 데모 [Code Sandbox](https://codesandbox.io/s/5wqo7z2np4).

### 커스텀 프로퍼티나 이벤트 핸들러 등을 덧붙일 수 있을까요?

네, `outerElementType` prop을 사용한다면 가능합니다.

<img width="412" alt="Screen Shot 2019-03-12 at 8 58 09 AM" src="https://user-images.githubusercontent.com/29597/54215333-f9ee9a80-44a4-11e9-9142-34c67026d950.png">

참고 데모 [Code Sandbox](https://codesandbox.io/s/4zqx79nww0).

### 리스트의 top 과 bottom 에 padding 을 추가할 수 있을까요?

네, 가능합니다만, 그것은 약간의 인라인 스타일링이 필요합니다.

<img width="418" alt="Screen Shot 2019-06-02 at 8 38 18 PM" src="https://user-images.githubusercontent.com/29597/58774454-65ad4480-8576-11e9-8889-07044fd41393.png">

참고 데모 [Code Sandbox](https://codesandbox.io/s/react-window-list-padding-dg0pq).

### 아이템 사이에 gutter 또는 padding 을 추가할 수 있을까요?

네, 가능합니다만, 그것 또한 약간의 인라인 스타일링이 필요합니다.

<img width="416" alt="Screen Shot 2019-03-26 at 6 33 56 PM" src="https://user-images.githubusercontent.com/29597/55043972-c14ad700-4ff5-11e9-9caa-2e9f4d85f96c.png">

참고 데모 [Code Sandbox](https://codesandbox.io/s/2w8wmlm89p).

### 이 라이브러리는 "sticky" 아이템 기능을 제공하나요?

네, 가능합니다만, 유저의 코드 작성이 일부 필요합니다. 

참고 데모 [Code Sandbox](https://codesandbox.io/s/0mk3qwpl4l).

## License

MIT © [bvaughn](https://github.com/bvaughn)
