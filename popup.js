// ポップアップが開かれたときに実行される処理
document.addEventListener('DOMContentLoaded', function () {
  console.log('Extension popup opened');

  // 要素を取得
  const resultDiv = document.getElementById('result');
  const courseList = document.getElementById('courseList');
  const fileInput = document.getElementById('excelFile');
  const fileName = document.getElementById('fileName');
  const autoProcessButton = document.getElementById('autoProcessButton');

  // Excelデータを保持する変数
  let excelData = null;

  // Excelファイルを読み込む関数
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    // ファイル情報をログに出力
    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: file.size + ' bytes'
    });

    // ファイル名を表示
    fileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      console.log('FileReader onload event fired');
      try {
        console.log('Reading file data...');
        const data = new Uint8Array(e.target.result);
        console.log('File data length:', data.length);

        console.log('Parsing Excel file...');
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('Workbook parsed successfully');
        console.log('Available sheets:', workbook.SheetNames);

        // 最初のシートを使用
        const firstSheetName = workbook.SheetNames[0];
        console.log('Using sheet:', firstSheetName);
        const worksheet = workbook.Sheets[firstSheetName];

        // ヘッダー行を探す
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        let headerRowIndex = -1;

        // 各行を走査してヘッダー行を探す
        for (let r = range.s.r; r <= range.e.r; r++) {
          let hasSubjectCode = false;
          let hasClassroom = false;

          // その行の各セルを確認
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
              if (cell.v.toString().includes('科目番号')) hasSubjectCode = true;
              if (cell.v.toString().includes('教室')) hasClassroom = true;
            }
          }

          // 両方のヘッダーが見つかった場合
          if (hasSubjectCode && hasClassroom) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('ヘッダー行（科目番号と教室を含む行）が見つかりませんでした。');
        }

        // 読み込み範囲をヘッダー行から設定
        range.s.r = headerRowIndex
        worksheet['!ref'] = XLSX.utils.encode_range(range);

        // ワークシートの範囲を確認
        console.log('Worksheet range:', worksheet['!ref']);

        // JSON形式に変換
        console.log('Converting to JSON...');
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // 必要なデータだけを抽出（科目番号と教室のみ）
        excelData = rawData.map(row => ({
          '科目番号': row['科目番号'],
          '教室': row['教室']
        })).filter(row => row['科目番号'] && row['教室']); // 両方のデータがある行のみ保持

        console.log('Filtered data:', {
          rowCount: excelData.length,
          sampleRows: excelData.slice(0, 3) // 最初の3行を表示
        });

        // データをChrome Storageに保存
        chrome.storage.local.set({ 'courseData': excelData }, function () {
          console.log('Data saved to storage');
        });

        // ボタンを有効化
        autoProcessButton.disabled = false;

        // 成功メッセージを表示
        resultDiv.textContent = 'ファイルの読み込みが完了しました。';
        resultDiv.style.color = '#4CAF50';

      } catch (error) {
        console.error('Error reading Excel file:', {
          error: error,
          message: error.message,
          stack: error.stack
        });
        resultDiv.textContent = `Excelファイルの読み込みに失敗しました: ${error.message}`;
        resultDiv.style.color = '#f44336';
        autoProcessButton.disabled = true;
      }
    };

    reader.onerror = function (error) {
      console.error('File reading error:', {
        error: error,
        type: error.type,
        target: error.target
      });
      resultDiv.textContent = `ファイルの読み込みに失敗しました: ${error.type || 'Unknown error'}`;
      resultDiv.style.color = '#f44336';
      autoProcessButton.disabled = true;
    };

    reader.readAsArrayBuffer(file);
  }

  // 授業要素をクリックする関数
  async function clickCourse(courseName) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'clickCourse',
        courseName: courseName
      });

      if (response.success) {
        console.log(response.message);
        // デバッグ用: 1秒後に自動で戻る
        setTimeout(async () => {
          console.log('Debug: Auto-clicking back button...');
          await chrome.tabs.sendMessage(tab.id, { action: 'clickBack' });
        }, 1000);
      } else {
        console.error(response.message);
      }
    } catch (error) {
      console.error('Error clicking course:', error);
    }
  }

  // 科目番号を自動取得する関数
  async function autoProcessCourses() {
    try {
      // まず授業一覧を取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'countCourses' });

      if (response.success) {
        const courses = response.courses;
        const results = [];
        resultDiv.textContent = `処理中... (0/${courses.length})`;

        // 各授業を順番に処理
        for (let i = 0; i < courses.length; i++) {
          const course = courses[i];
          resultDiv.textContent = `処理中... (${i + 1}/${courses.length})`;

          try {
            // 授業をクリック
            await clickCourse(course.name);

            // 科目番号を取得
            const codeResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getCourseCode' });
            const code = codeResponse.code;

            // エクセルから教室情報を取得
            let roomInfo = '';
            if (code && excelData) {
              const courseData = excelData.find(data => data['科目番号'] === code);
              if (courseData && courseData['教室']) {
                roomInfo = courseData['教室'];
              }
            }

            // 科目番号と教室情報をコンソールに出力
            const codeStr = code || '取得失敗';
            const roomStr = roomInfo ? ` (教室: ${roomInfo})` : '';
            console.log(`科目番号: ${course.name} => ${codeStr}${roomStr}`);

            results.push({
              name: course.name,
              code: code,
              room: roomInfo,
              success: true
            });

            // 教室情報追加リンクをクリック
            console.log(`${course.name}: 教室情報追加リンクをクリックしようとしています...`);
            const addRoomResponse = await chrome.tabs.sendMessage(tab.id, {
              action: 'clickAddRoom',
              roomInfo: roomInfo // エクセルから取得した教室情報を渡す
            });
            console.log(`${course.name}: 教室情報追加リンクのクリック結果:`, addRoomResponse);

            // リンクが見つからなかった場合は少し待機して再試行
            if (!addRoomResponse.success) {
              console.log(`${course.name}: リンクが見つからなかったので待機して再試行します...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retryResponse = await chrome.tabs.sendMessage(tab.id, {
                action: 'clickAddRoom',
                roomInfo: roomInfo // 再試行時も教室情報を渡す
              });
              console.log(`${course.name}: 再試行結果:`, retryResponse);
            }

            // 少し待機して次の処理へ
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            console.error(`Error processing course ${course.name}:`, error);
            results.push({
              name: course.name,
              error: error.message,
              success: false
            });
          }
        }

        // 結果を表示
        resultDiv.textContent = '科目番号の取得が完了しました。';
        resultDiv.style.color = '#4CAF50';

        // 授業リストを更新
        courseList.innerHTML = '';
        results.forEach(result => {
          const courseItem = document.createElement('div');
          courseItem.className = 'course-item';

          const container = document.createElement('div');
          container.className = 'clickable-container';

          const courseName = document.createElement('div');
          courseName.className = 'course-name';
          courseName.textContent = result.name;
          container.appendChild(courseName);

          // 科目番号と教室情報を表示
          const codeInfo = document.createElement('div');
          codeInfo.className = 'code-info';
          if (result.success && result.code) {
            let infoText = `科目番号: ${result.code}`;
            if (result.room) {
              infoText += ` (教室: ${result.room})`;
            }
            codeInfo.textContent = infoText;
            codeInfo.style.color = '#4CAF50';
          } else {
            codeInfo.textContent = result.error || '科目番号を取得できませんでした。';
            codeInfo.style.color = '#f44336';
          }
          container.appendChild(codeInfo);

          courseItem.appendChild(container);
          courseList.appendChild(courseItem);
        });
      } else {
        resultDiv.textContent = response.message || 'エラーが発生しました。';
        resultDiv.style.color = '#f44336';
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.textContent = 'エラーが発生しました。コンソールを確認してください。';
      resultDiv.style.color = '#f44336';
    }
  }

  // イベントリスナーを追加
  fileInput.addEventListener('change', handleFileSelect);
  autoProcessButton.addEventListener('click', autoProcessCourses);

  // 初期状態ではボタンを無効化
  autoProcessButton.disabled = true;

  // 保存されたデータがあれば読み込む
  chrome.storage.local.get(['courseData'], function (result) {
    if (result.courseData) {
      excelData = result.courseData;
      autoProcessButton.disabled = false;
      document.getElementById('autoProcessButton').disabled = false;
      resultDiv.textContent = '保存されたデータを読み込みました。';
      resultDiv.style.color = '#4CAF50';
    }
  });
});
