from tests.conftest import VALID_USER


def auth(client):
    response = client.post('/api/v1/auth/signup', json=VALID_USER)
    return {'Authorization': f"Bearer {response.json()['data']['tokens']['access_token']}"}


def test_profile_update_stats_and_password(client):
    headers = auth(client)
    response = client.put('/api/v1/profile', headers=headers, json={
        'full_name': 'Updated User',
        'email': 'updated@example.com',
        'phone': '+15555555555',
        'avatar': 'data:image/png;base64,abcdef'
    })
    assert response.status_code == 200
    user_data = response.json()['data']['user']
    assert user_data['full_name'] == 'Updated User'
    assert user_data['phone'] == '+15555555555'
    assert user_data['avatar'] == 'data:image/png;base64,abcdef'

    me_response = client.get('/api/v1/auth/me', headers=headers)
    assert me_response.status_code == 200
    me_user_data = me_response.json()['data']['user']
    assert me_user_data['phone'] == '+15555555555'
    assert me_user_data['avatar'] == 'data:image/png;base64,abcdef'

    assert client.get('/api/v1/profile/stats', headers=headers).status_code == 200
    wrong = client.put('/api/v1/profile/password', headers=headers, json={'current_password': 'wrong', 'new_password': 'NewStr0ng!Pass'})
    assert wrong.status_code == 401
    correct = client.put('/api/v1/profile/password', headers=headers, json={'current_password': VALID_USER['password'], 'new_password': 'NewStr0ng!Pass'})
    assert correct.status_code == 200


def test_backup_restore_validation_and_data(client):
    headers = auth(client)
    habit = {'name':'Read','description':'Daily reading','category':'learning','frequency':'Daily','start_date':'2026-07-27','icon':'book-open','color':'blue'}
    journal = {'title':'Today','content':'A valid journal entry','entry_date':'2026-07-27','mood':'Happy','tags':'wins'}
    assert client.post('/api/v1/habits', headers=headers, json=habit).status_code == 201
    assert client.post('/api/v1/journals', headers=headers, json=journal).status_code == 201
    backup = client.get('/api/v1/data/backup', headers=headers).json()['data']
    assert len(backup['habits']) == 1 and len(backup['journal_entries']) == 1
    assert client.post('/api/v1/data/restore', headers=headers, json={'format':'wrong','version':1,'habits':[],'journal_entries':[]}).status_code == 422
    response = client.post('/api/v1/data/restore', headers=headers, json=backup)
    assert response.status_code == 200
    assert len(client.get('/api/v1/habits', headers=headers).json()['data']) == 1
    assert len(client.get('/api/v1/journals', headers=headers).json()['data']) == 1
