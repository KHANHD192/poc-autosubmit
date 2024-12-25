const axios = require('axios');
require('dotenv').config()
const { HttpsProxyAgent } = require('https-proxy-agent')

const API_KEY = process.env.API_KEY;
const API_URL =process.env.API_URL

const agent = new HttpsProxyAgent('http://127.0.0.1:8080');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const baseurl =process.env.baseURL;
async function Login(){
    let response =  await axios.post(baseurl + '/api/auth/login.json',{"email":process.env.EMAIL,"password":process.env.PASSWORD,"domain":"hocvalamtheobac.mobiedu.vn"})
    return response.data.user.token;
}

let axiosInstance; 
Login().then(async (result) =>   {
    
        axiosInstance =  axios.create({
        baseURL: baseurl,
        timeout: 1000,
        httpsAgent: agent,
        headers: { 
            'Content-Type' : 'application/json',
            'Authorization': `Bearer ${result}` }
      });
      
// handle

// STEP1 
let resp_step1 = await axiosInstance.get('/admin/room_details.json?id=9e215727-3465-42ee-9c71-d2a4b4268df3')
// console.log(resp_step1)
//STEP2 
let resp_step2 =  await  axiosInstance.post('/admin/answer/create.json',{
    "room_id":"9e215727-3465-42ee-9c71-d2a4b4268df3"
})
// let user_answer_id = resp_step2.data.data.id
//STEP3 
let resp_step3 = await axiosInstance.get('/admin/room_details.json?id=9e215727-3465-42ee-9c71-d2a4b4268df3')
let answer_id = resp_step3.data.data.answers[0].id

// STEP 4
let resp_step4 = await axiosInstance.get('/admin/answer_details.json?id='+answer_id)
let exam_id = resp_step4.data.data.exam_id
//STEP5 
let resp_step5 = await axiosInstance.get('/admin/exam_details.json?id='+exam_id)
//call chatgpt to get result 
 let first_question = resp_step5.data.data.questions[0]

  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Bạn là giáo viên có chuyên môn giảo trong tất cả các môn ' },
          { role: 'user', content: ` Tôi có câu hỏi và một loại các câu trả lời ở phía sau (${first_question.question.content}),mỗi câu trả lời sẽ được đính trước bằng 1 mã số ID được ngăn cách bằng với cú pháp như sau ID@Câu-Trả-Lời ,(lưu ý quan trọng chỉ trả về ID của câu trả lời đúng),Các câu trả lời như sau:
            ${first_question.answers[0].id}@${first_question.answers[0].content},
            ${first_question.answers[1].id}@${first_question.answers[1].content},
            ${first_question.answers[2].id}@${first_question.answers[2].content},
            ${first_question.answers[3].id}@${first_question.answers[3].content},
            Ví dụ về cách trả về kết quả:
                Nếu câu hỏi là : Sau chiến thắng Phước Long, Bộ Chính trị đã bổ sung và hoàn chỉnh kế hoạch giải phóng miền Nam như thế nào?
                Và nếu câu trả lời là như sau:
                ofiPQcmbes@Nếu thời cơ đến vào đầu hoặc cuối năm 1975 thì lập tức giải phóng miền Nam trong năm 1975.
                Thì tôi chỉ muốn bạn trả về kết quả là ofiPQcmbes
            ` }
        ],
        max_tokens: 200,
        temperature: 0.7
      },
      {
        headers: {
          'X-Pwnfox-Color': 'blue',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}` 
        }
      }
    );

    //generate đáp án 
    let body = {};
    body.answer=[];
    body.user_answer_id =answer_id
    

    // console.log( response.data.choices[0].message.content)
    let id;
    const match = response.data.choices[0].message.content.match(/\b[a-zA-Z0-9]{10}\b/g);
    if (match) {
        id = match[0];
    }else{
      console.log("Id not found from API chat PGT")
      return;
    }
    let first_question_answer ={
        "id":first_question.id,
        "select":id
    }
    for(i = 0 ; i < 30 ; i++){
        body.answer.push(first_question_answer)
    }

 //STEP 6
 let body_presave = JSON.parse(JSON.stringify(body));
 body_presave.status= "presave"
 let resp_step6 = await axiosInstance.post('/admin/answer/presave.json',JSON.stringify(body_presave))
 let body_finished = JSON.parse(JSON.stringify(body));
 body_finished.action_type="manual"
 let resp_step7 = await axiosInstance.post('/admin/answer/finish.json',JSON.stringify(body_finished))
 console.log( "Your-score:"  + resp_step7.data.data.total_point);
  } catch (error) {
    console.error('Error calling ChatGPT API:', error.response ? error.response.data : error.message);
  }
})