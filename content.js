// コンテンツスクリプト
console.log('Content script loaded');

// Google Analyticsのリクエストをインターセプトして修正
const originalXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function() {
  const xhr = new originalXHR();
  const originalOpen = xhr.open;
  
  xhr.open = function() {
    const url = arguments[1];
    if (url && url.includes('google-analytics.com')) {
      this.withCredentials = false;
    }
    return originalOpen.apply(this, arguments);
  };
  
  return xhr;
};

// 科目番号を取得する関数
function getCourseCode() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const codeElement = document.querySelector('p.main__code');
      if (codeElement) {
        resolve(codeElement.textContent.trim());
      } else {
        resolve(null);
      }
    }, 1000); // 要素が表示されるまで待機
  });
}

// 教室情報追加ページを表示する関数
function clickAddRoomLink(roomInfo = '') {
  return new Promise((resolve) => {
    // 現在のURLを取得
    const currentUrl = window.location.href;
    console.log('現在のURL:', currentUrl);

    // URLからコースIDとドメインを抽出
    const courseMatch = currentUrl.match(/(https?:\/\/[^/]+)\/course\/([^/]+)/);
    if (!courseMatch) {
      console.log('コースIDを抽出できませんでした');
      resolve(false);
      return;
    }

    const [, domain, courseId] = courseMatch;
    const editUrl = `${domain}/course/${courseId}/edit#section-rooms`;
    console.log('教室情報編集URL:', editUrl);

    // 既存のiframeを削除
    const existingIframe = document.querySelector('#room-editor-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    // iframeを作成
    const iframe = document.createElement('iframe');
    iframe.id = 'room-editor-iframe';
    iframe.src = editUrl;
    iframe.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 80%; z-index: 10000; border: none; box-shadow: 0 0 10px rgba(0,0,0,0.5); background: white;';

    // 背景オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.id = 'room-editor-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;';

    // 閉じるボタンを作成
    const closeButton = document.createElement('button');
    closeButton.textContent = '✖';
    closeButton.style.cssText = 'position: fixed; top: 10%; right: 11%; z-index: 10001; background: white; border: none; font-size: 24px; cursor: pointer; padding: 5px 10px; border-radius: 50%;';

    // 閉じる処理
    const closeEditor = () => {
      iframe.remove();
      overlay.remove();
      closeButton.remove();
      resolve(true);
    };

    // クリックイベントを設定
    closeButton.addEventListener('click', closeEditor);
    overlay.addEventListener('click', closeEditor);

    // 要素を追加
    document.body.appendChild(overlay);
    document.body.appendChild(closeButton);

    // iframeの読み込み完了を待つ
    const onloadHandler = () => {
      // section-roomsが表示されるまで待機
      const checkButton = setInterval(() => {
        const roomSection = iframe.contentDocument.querySelector('#section-rooms');
        if (roomSection) {
          const addButton = roomSection.querySelector('.tertiary-button.tertiary-button--ghost');
          if (addButton) {
            clearInterval(checkButton);
            addButton.click();
            console.log('section-rooms内の追加ボタンをクリックしました');

            // 入力フィールドが表示されるまで待機
            const checkInput = setInterval(() => {
              // section-rooms内の入力フィールドを探す
              const roomSection = iframe.contentDocument.querySelector('#section-rooms');
              if (roomSection) {
                const targetInput = roomSection.querySelector('.text-field__input');
                if (targetInput) {
                  clearInterval(checkInput);
                  targetInput.value = roomInfo; // エクセルから取得した教室情報を入力
                  targetInput.dispatchEvent(new Event('input')); // 入力イベントを発火
                  console.log('教室情報を入力しました');

                  // 保存ボタンが表示されるまで待機
                  const checkSaveButton = setInterval(() => {
                    const saveButton = iframe.contentDocument.querySelector('.button.button--large.button--primary.button--fill');
                    if (saveButton) {
                      clearInterval(checkSaveButton);
                      saveButton.click();
                      console.log('保存ボタンをクリックしました');

                      // 500ms後にiframeを閉じる
                      setTimeout(() => {
                        closeEditor();
                        console.log('iframeを閉じました');
                      }, 500);
                    }
                  }, 500);

                  // 10秒後に保存ボタンのチェックを停止
                  setTimeout(() => {
                    clearInterval(checkSaveButton);
                    console.log('保存ボタンが見つかりませんでした');
                    closeEditor();
                  }, 10000);
                }
              }
            }, 500);

            // 10秒後に入力フィールドのチェックを停止
            setTimeout(() => {
              clearInterval(checkInput);
              console.log('入力フィールドが見つかりませんでした');
              closeEditor();
            }, 10000);
          }
        }
      }, 500);

      // 10秒後にチェックを停止
      setTimeout(() => {
        clearInterval(checkButton);
        console.log('追加ボタンが見つかりませんでした');
        closeEditor();
      }, 10000);
    };

    // iframeを追加してハンドラを設定
    iframe.onload = onloadHandler;
    document.body.appendChild(iframe);
  });
}

// 戻るボタンをクリックする関数
function clickBackButton() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const backButton = document.querySelector('button.icon-button--large span.material-icons');
      if (backButton && backButton.textContent.trim() === 'arrow_back') {
        backButton.closest('button').click();
        resolve(true);
      } else {
        resolve(false);
      }
    }, 1000);
  });
}

// 有効な授業タイルを取得する関数
function getValidCourseTiles() {
  console.log('Searching for valid course tiles...');
  const courseTiles = document.querySelectorAll('.tile.--default.table__course');
  console.log(`Found ${courseTiles.length} tiles with class .tile.--default.table__course`);

  const validTiles = Array.from(courseTiles).filter(tile => {
    const nameElement = tile.querySelector('.tile__course-name');
    const name = nameElement ? nameElement.textContent.trim() : '';
    if (name) {
      console.log(`Valid tile found: ${name}`);
      return true;
    }
    return false;
  });

  console.log(`Total valid tiles: ${validTiles.length}`);
  return validTiles;
}

// 授業情報を取得する関数
function getCourseInfo(tile) {
  const nameElement = tile.querySelector('.tile__course-name');
  const roomElement = tile.querySelector('.tile__course-room');
  return {
    name: nameElement ? nameElement.textContent.trim() : '',
    room: roomElement ? roomElement.textContent.trim() : '',
    element: tile // DOM要素への参照を保持
  };
}

// すべての授業を処理する関数
async function processAllCourses() {
  console.log('Starting to process all courses...');
  const validCourses = getValidCourseTiles();
  console.log(`Found ${validCourses.length} valid courses to process`);
  const results = [];

  for (let i = 0; i < validCourses.length; i++) {
    const tile = validCourses[i];
    try {
      const courseInfo = getCourseInfo(tile);
      console.log(`\n[${i + 1}/${validCourses.length}] Processing course: ${courseInfo.name}`);
      console.log('Course element:', courseInfo.element);
      console.log('Course element classes:', courseInfo.element.className);

      // Vueコンポーネントのイベントをトリガー
      console.log('Attempting to trigger Vue event...');

      // クリックイベントをシミュレート
      const events = [
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
        new MouseEvent('click', { bubbles: true, cancelable: true }),
        // Vue特有のカスタムイベント
        new CustomEvent('vclick', { bubbles: true, cancelable: true }),
        new CustomEvent('v-click', { bubbles: true, cancelable: true })
      ];

      // すべてのイベントを順番にディスパッチ
      for (const event of events) {
        courseInfo.element.dispatchEvent(event);
        console.log(`Dispatched ${event.type} event`);
      }

      // 直接クリックも試す
      courseInfo.element.click();

      // 少し待機してイベントが処理されるのを確認
      await new Promise(resolve => setTimeout(resolve, 500));

      // 科目番号を取得
      console.log('Waiting for course code...');
      const code = await getCourseCode();
      console.log(`Retrieved code for ${courseInfo.name}: ${code}`);

      // 戻るボタンをクリック
      console.log('Clicking back button...');
      await clickBackButton();
      console.log('Back button clicked');

      results.push({
        name: courseInfo.name,
        code: code,
        success: true
      });

      // 次の授業を処理する前に少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error processing course:`, error);
      results.push({
        name: courseInfo?.name || 'Unknown',
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autoProcess') {
    // 非同期処理を行うため、trueを返して接続を維持
    processAllCourses().then(results => {
      sendResponse({
        success: true,
        results: results
      });
    }).catch(error => {
      sendResponse({
        success: false,
        error: error.message
      });
    });
    return true; // 非同期処理を行うことを示す
  } else if (request.action === 'countCourses') {
    const validCourses = getValidCourseTiles();
    const courseInfo = validCourses.map(getCourseInfo);

    // 同一授業名を持つ授業をグループ化
    const uniqueCourses = Object.values(courseInfo.reduce((acc, course) => {
      if (!acc[course.name]) {
        acc[course.name] = {
          name: course.name,
          rooms: new Set([course.room]),
          elements: [course.element] // DOM要素への参照を保持
        };
      } else {
        acc[course.name].rooms.add(course.room);
        acc[course.name].elements.push(course.element);
      }
      return acc;
    }, {}));

    // 教室情報を配列に変換し、空の教室を除外
    const formattedCourses = uniqueCourses.map(course => ({
      name: course.name,
      rooms: Array.from(course.rooms).filter(room => room !== '').sort(),
      elements: course.elements // DOM要素への参照を保持
    }));

    // 結果を返信
    sendResponse({
      success: true,
      count: uniqueCourses.length,
      courses: formattedCourses,
      message: `Found ${uniqueCourses.length} unique courses`
    });
  } else if (request.action === 'clickCourse') {
    const { courseName } = request;
    const validCourses = getValidCourseTiles();
    const courseInfo = validCourses.map(getCourseInfo);

    // 指定された授業名の要素を探す
    const targetCourse = courseInfo.find(course => course.name === courseName);

    if (targetCourse && targetCourse.element) {
      // 要素が見つかった場合、クリックを実行
      targetCourse.element.click();
      sendResponse({
        success: true,
        message: `Clicked course: ${courseName}`
      });
    } else {
      sendResponse({
        success: false,
        message: `Course not found: ${courseName}`
      });
    }
  } else if (request.action === 'clickBack') {
    // デバッグ用: 戻るボタンをクリック
    clickBackButton().then(success => {
      sendResponse({
        success,
        message: success ? 'Back button clicked' : 'Back button not found'
      });
    });
    return true;
  } else if (request.action === 'getCourseCode') {
    // 科目番号を取得
    getCourseCode().then(code => {
      sendResponse({
        success: true,
        code: code
      });
    });
    return true;
  } else if (request.action === 'clickAddRoom') {
    // 教室情報追加リンクをクリック
    clickAddRoomLink(request.roomInfo).then(success => {
      sendResponse({
        success,
        message: success ? 'Add room link clicked and room info entered' : 'Add room link not found'
      });
    });
    return true;
  }
  return true; // 非同期レスポンスのために必要
});
